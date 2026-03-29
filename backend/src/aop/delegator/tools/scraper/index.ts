import { logger } from 'aop/logging';
import { parseSchema } from 'lib/validation';

import constants from './constants';

import type { ScraperOnTargetFinish } from './types';
import type {
    FinishTargetResources,
    ProcessExtractionTargetResultResources,
    ProcessSchemaValidationFailureResources,
    ScraperRequest,
    Target,
    TargetMap,
} from './types';
import type { ScraperTool } from 'shared/types/jobs/tools/types-tools-scraper';

import { requestUserDataSchema } from './schemas';
import targetRegistry from './targets';
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { kebabToCamelCase } from 'utils';

/**
 * Scraper tool handler for executing web scraping job operations.
 *
 * Orchestrates the scraping of job listings from configured platforms (e.g., jobs.ch).
 * Uses PlaywrightCrawler to:
 * - Navigate through paginated job listing pages
 * - Extract job detail URLs matching configured glob patterns
 * - Scrape structured data from detail pages (title, description, information, company name)
 * - Handle concurrent request processing with proper error handling
 * - Aggregate results per target and invoke completion callbacks
 *
 * ## Request lifecycle
 * Every scrape run follows a two-phase request model:
 *
 * **Phase 1 — target request**
 * One initial request is enqueued per configured target. The target's `processRequest`
 * navigates paginated listing pages, calls `enqueueLinks` for each matching job URL, and
 * returns the unique keys of those enqueued extraction requests. The scraper records those
 * keys in `targetMap` so it can track when all of them have been processed.
 *
 * **Phase 2 — extraction requests**
 * Each enqueued job-detail URL is processed concurrently. The target's `processRequest`a
 * scrapes the page and returns a structured result. As each extraction request completes,
 * its unique key is removed from the target's pending set. When the set reaches zero the
 * target is finished and `onTargetFinish` is called exactly once.
 *
 * ## Concurrency safety
 * PlaywrightCrawler runs multiple `requestHandler` invocations concurrently. Because
 * Node.js is single-threaded, "concurrent" means interleaved async tasks — no two
 * handlers execute JavaScript simultaneously. All shared-state mutations (deleting from
 * `uniqueKeys`, pushing to `results`, setting `completed`) happen synchronously after the
 * single `await target.processRequest(...)` in the handler. The check-then-set guard
 * (`uniqueKeys.size === 0 && !target.completed`) is therefore atomic: the first handler
 * to pass it sets `completed = true` before any other handler can observe the state,
 * ensuring `onTargetFinish` is called exactly once per target regardless of concurrency.
 */
class Scraper {
    /**
     * Safely retrieves a target from the registry with runtime validation.
     *
     * The registry is a plain object keyed by camelCase target names. A direct property
     * access would succeed even for inherited prototype keys (e.g., `toString`), so the
     * explicit `in` check restricts lookups to own enumerable keys only.
     *
     * @param targetName - The camelCase name of the target (e.g., `"jobsCh"`)
     * @returns The target instance, or `null` if the name is not registered
     */
    private getTargetFromRegistry(targetName: string): (typeof targetRegistry)[keyof typeof targetRegistry] | null {
        const key = targetName as keyof typeof targetRegistry;
        return key in targetRegistry ? targetRegistry[key] : null;
    }

    /**
     * Builds the initial target requests and initialises the per-target tracking state.
     *
     * One request is created per `tool.targets` entry. Each request uses a placeholder
     * URL because the real listing URL is constructed inside the target's `processRequest`
     * based on keywords and page index — the crawler itself never navigates to this URL.
     *
     * Per-target keywords and maxPages fall back to the tool-level values when not
     * overridden at the target level, allowing shared defaults across targets.
     *
     * The `targetMap` entry created here is the shared mutable state that both phases of
     * the request lifecycle read and write. It must be initialised before the crawler
     * starts, otherwise extraction requests arriving before their target-request handler
     * runs would find no entry to update.
     *
     * @param targetMap - Mutated in place: one entry added per target
     * @param tool - The scraper tool configuration
     * @returns The list of initial target requests to enqueue
     */
    private getInitialTargetRequests(targetMap: TargetMap, tool: ScraperTool): ScraperRequest[] {
        const initialTargetRequests: ScraperRequest[] = [];

        for (const targetSettings of tool.targets) {
            const keywords = targetSettings.keywords || tool.keywords;
            const maxPages = targetSettings.maxPages || tool.maxPages;

            targetMap.set(targetSettings.targetId, {
                uniqueKeys: new Set(),
                results: [],
                completed: false,
            });

            initialTargetRequests.push({
                url: constants.placeholderUrl,
                uniqueKey: `target-request-${targetSettings.targetId}`,
                userData: {
                    label: constants.requestLabels.targetRequest,
                    targetId: targetSettings.targetId,
                    target: targetSettings.target,
                    keywords,
                    maxPages,
                },
            });
        }

        return initialTargetRequests;
    }

    /**
     * Records the result of a completed extraction request and finishes the target when
     * all extraction requests for it have been processed.
     *
     * Called for both successful and failed extraction requests — the distinction is
     * encoded in `resources.targetResult` (`error: null` vs `result: null`).
     *
     * The completion check (`uniqueKeys.size === 0 && !target.completed`) is the
     * concurrency guard: it ensures `finishTarget` is called exactly once even when
     * multiple handlers complete simultaneously. Because Node.js is single-threaded, the
     * check and the `completed = true` assignment are effectively atomic — no other
     * handler can interleave between them.
     *
     * @param resources - The target map, user data, unique key to retire, result to
     *   record, and the onTargetFinish callback
     */
    private processExtractionTargetResult(resources: ProcessExtractionTargetResultResources) {
        const target = resources.targetMap.get(resources.userData.targetId);

        if (target) {
            // Retire this request from the pending set and record its result.
            target.uniqueKeys.delete(resources.uniqueKey);
            target.results.push(resources.targetResult);
        } else {
            logger.error(
                `Extraction target result processing failed, target not found for target id: ${resources.userData.targetId}`,
                {}
            );
            return;
        }

        const isTargetToUniqueKeysMapEmpty = target.uniqueKeys.size === 0;

        // Only the handler that empties the set and wins the completed guard fires the callback.
        if (isTargetToUniqueKeysMapEmpty && !target.completed) {
            target.completed = true;
            this.finishTarget({
                userData: resources.userData,
                results: target.results,
                onTargetFinish: resources.onTargetFinish,
            });
        }
    }

    /**
     * Handles the case where crawlee's `request.userData` fails schema validation.
     *
     * This should not occur in normal operation since all requests are constructed
     * internally with known shapes. It guards against data corruption or unexpected
     * crawlee internals injecting unrecognised fields.
     *
     * - **Target-request failure:** The target can never proceed (no extraction requests
     *   will be enqueued), so it is immediately marked as completed to prevent it from
     *   hanging indefinitely. `onTargetFinish` is NOT called — the target is silently
     *   abandoned.
     * - **Extraction-request failure:** The request is retired from the pending set. If
     *   it was the last pending request, the target is marked completed. Again,
     *   `onTargetFinish` is NOT called — the result is silently dropped.
     *
     * @param resources - The target map, the raw failed request, and the validation issues
     */
    private processSchemaValidationFailure(resources: ProcessSchemaValidationFailureResources) {
        logger.error(`Target request schema validation failed for: ${JSON.stringify(resources.request)}`, {
            issues: resources.issues,
        });

        const target = resources.targetMap.get(resources.request?.userData?.targetId);

        if (!target) {
            logger.error('Schema validation failure processing failed, target not found', {});
            return;
        }

        const label = resources.request?.userData?.label;

        if (label === constants.requestLabels.targetRequest) {
            // Terminal failure: without a valid target request no extraction requests can ever
            // be enqueued, so mark completed to avoid the target hanging open indefinitely.
            target.completed = true;
            logger.error('Target request found and marked as completed after schema validation failed', {});
        } else if (label === constants.requestLabels.extractionRequest) {
            const uniqueKey = target.uniqueKeys.has(resources.request.uniqueKey);

            if (!uniqueKey) {
                logger.error('Unique key for extraction request not found for target', {});
                return;
            }

            // Retire the failed request and apply the same completion check used by the
            // happy path so the target can still finish if all other requests are done.
            target.uniqueKeys.delete(resources.request.uniqueKey);

            const isTargetToUniqueKeysMapEmpty = target.uniqueKeys.size === 0;

            if (isTargetToUniqueKeysMapEmpty && !target.completed) {
                logger.error('Extraction target completed but request schema validation failed', {});
                target.completed = true;
            }

            return;
        }

        logger.error('Schema validation failure processing failed due to unknown request label', {});
    }

    /**
     * Strips crawlee's internal `__crawlee` metadata from `userData` and invokes the
     * `onTargetFinish` callback with the clean payload.
     *
     * `__crawlee` is injected by crawlee at request-processing time and is an
     * implementation detail that must not leak into the public callback interface.
     *
     * @param resources - The user data, results, and the onTargetFinish callback
     */
    private finishTarget(resources: FinishTargetResources) {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        const { __crawlee, ...rest } = resources.userData;
        resources.onTargetFinish({ ...rest, results: resources.results });
    }

    /**
     * Executes the scraper tool for given targets.
     *
     * Initialises per-target tracking state, populates the request queue with one target
     * request per configured target, then runs the PlaywrightCrawler to completion.
     * `onTargetFinish` is called once for each target as its extraction requests finish.
     *
     * @param tool - The scraper tool configuration (targets, keywords, maxPages)
     * @param onTargetFinish - Callback invoked when all extraction requests for a target
     *   have completed (successfully or with errors)
     */
    async execute({ tool, onTargetFinish }: { tool: ScraperTool; onTargetFinish: ScraperOnTargetFinish }) {
        // Keyed by targetId. Each entry tracks which extraction-request unique keys are
        // still pending, the accumulated results, and whether the target has been finished.
        const targetMap: TargetMap = new Map<string, Target>();

        // A timestamp-suffixed queue name ensures each run gets a fresh queue and prevents
        // crawlee from deduplicating requests across runs via its persistent request store.
        const requestQueue = await RequestQueue.open(`scraper-${Date.now()}`);
        const initialTargetRequests: ScraperRequest[] = this.getInitialTargetRequests(targetMap, tool);
        await requestQueue.addRequests(initialTargetRequests);

        const crawler = new PlaywrightCrawler({
            requestQueue,
            // maxRequestRetries defaults to 3.
            // The handler runs concurrently for every request in the queue (controlled by
            // crawlee's concurrency settings). All shared-state mutations below happen
            // synchronously after the single await, making them safe under Node.js's
            // single-threaded event loop.
            requestHandler: async ({ page, request, enqueueLinks }) => {
                const userDataResult = parseSchema(requestUserDataSchema, request.userData);

                if (!userDataResult.success) {
                    this.processSchemaValidationFailure({
                        targetMap,
                        request,
                        issues: userDataResult.issues,
                    });
                    return;
                }

                const userData = userDataResult.data;
                // Target names are stored as kebab-case (e.g., "jobs-ch") in userData but
                // the registry uses camelCase keys (e.g., "jobsCh").
                const targetToCamelCase = kebabToCamelCase(userData.target);
                const target = this.getTargetFromRegistry(targetToCamelCase);

                if (!target) {
                    const results = [
                        {
                            result: null,
                            error: { message: `Could not find target class with name: ${targetToCamelCase}` },
                        },
                    ];
                    this.finishTarget({ userData, results, onTargetFinish });

                    return;
                }

                // The only await in the handler. All state mutations after this point run
                // synchronously, preserving the concurrency-safety guarantee.
                const requestResult = await target.processRequest({ page, request, userData, enqueueLinks });

                if (userData.label === constants.requestLabels.targetRequest) {
                    if (requestResult.uniqueKeys) {
                        const target = targetMap.get(userData.targetId);

                        if (target) {
                            // Register all enqueued extraction-request unique keys so the
                            // completion check knows how many requests to wait for.
                            for (const uniqueKey of requestResult.uniqueKeys) {
                                target.uniqueKeys.add(uniqueKey);
                            }

                            // If the target request produced no matching extraction URLs
                            // (e.g. a keyword search returned zero results), no extraction
                            // requests will ever be enqueued and the set will stay empty
                            // forever. Finish the target immediately with empty results.
                            // This is safe to do here because we are still in the
                            // synchronous block after the await — no extraction-request
                            // handler could have interleaved and already decremented the set.
                            if (target.uniqueKeys.size === 0) {
                                target.completed = true;
                                this.finishTarget({
                                    userData,
                                    results: [
                                        { result: null, error: { message: 'No matching extraction URLs found' } },
                                    ],
                                    onTargetFinish,
                                });
                            }
                        } else {
                            logger.error(`Target not found for target id: ${userData.targetId}`, {});
                        }
                    } else {
                        // processRequest returned no unique keys, meaning no extraction
                        // requests were enqueued. Treat this as a terminal target failure.
                        const results = [
                            {
                                result: null,
                                error: {
                                    message: `Target request processing failed due to missing unique keys: ${JSON.stringify(requestResult)}`,
                                },
                            },
                        ];
                        this.finishTarget({ userData, results, onTargetFinish });
                    }
                } else if (userData.label === constants.requestLabels.extractionRequest) {
                    const baseResources = {
                        targetMap,
                        userData,
                        uniqueKey: request.uniqueKey,
                        onTargetFinish,
                    };

                    if (requestResult.result) {
                        this.processExtractionTargetResult({
                            ...baseResources,
                            targetResult: { result: requestResult.result, error: null },
                        });
                    } else {
                        // Record an error result for this item so the target can still
                        // finish once all other extraction requests complete.
                        logger.error(`Extraction request processing failed: ${request.uniqueKey}`, {});

                        this.processExtractionTargetResult({
                            ...baseResources,
                            targetResult: {
                                result: null,
                                error: { message: `Extraction request processing failed: ${request.url}` },
                            },
                        });
                    }
                } else {
                    logger.error(`Request processing failed due to unknown request label: ${userData.label}`, {});
                }
            },
        });

        await crawler.run();
    }
}

export default Scraper;
