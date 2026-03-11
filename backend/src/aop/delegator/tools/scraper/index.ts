import { logger } from 'aop/logging';
import { parseSchema } from 'lib/validation';

import constants from './constants';

import type { ExecuteFunction } from '../../tools/types';
import type { RequestUserData, ScraperRequest, ScraperResult } from './types';

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
 */
class Scraper {
    /**
     * Safely retrieves a target from the registry with runtime validation.
     * @param targetName - The camelCase name of the target
     * @returns The target instance or null if not found
     */
    private getTargetFromRegistry(targetName: string): (typeof targetRegistry)[keyof typeof targetRegistry] | null {
        const key = targetName as keyof typeof targetRegistry;
        return key in targetRegistry ? targetRegistry[key] : null;
    }

    /**
     * Executes the scraper tool for given targets.
     */
    async execute({
        tool,
        onTargetFinish,
    }: Parameters<ExecuteFunction<'scraper'>>[0]): ReturnType<ExecuteFunction<'scraper'>> {
        // Determine tracking maps for targets and requests
        const targetToUniqueKeysMap = new Map<string, Set<string>>();
        const targetToResultsMap = new Map<string, ScraperResult[]>();
        const completedTargets = new Set<string>();

        /**
         * Callback function to invoke onTargetFinish with the target results.
         * @param targetId - The ID of the target.
         * @param results - The results of the target.
         */
        function callbackWithTargetResults(userData: RequestUserData, results: ScraperResult[]) {
            // Remove the __crawlee property from the user data.
            // eslint-disable-next-line
            const { __crawlee, ...spread } = userData;

            onTargetFinish({
                ...spread,
                results,
            });
        }

        /**
         * Determine PlaywrightCrawler request objects for each target and populate the request queue.
         */
        // Use a unique request queue name to gather analytics for each queue
        // and prevent requests from being cached by crawlee.
        const requestQueueName = `scraper-${Date.now()}`;
        const requestQueue = await RequestQueue.open(requestQueueName);
        const requests: ScraperRequest[] = [];

        for (const targetSettings of tool.targets) {
            const keywords = targetSettings.keywords || tool.keywords;
            const maxPages = targetSettings.maxPages || tool.maxPages;

            targetToUniqueKeysMap.set(targetSettings.targetId, new Set());
            targetToResultsMap.set(targetSettings.targetId, []);

            requests.push({
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

        await requestQueue.addRequests(requests);

        /**
         * Initialize the PlaywrightCrawler crawler and start the scraping process.
         */
        const crawler = new PlaywrightCrawler({
            requestQueue,
            // maxRequestRetries defaults to 3
            // NOTE: This runs concurrently (Controlled via concurrency settings) for every request in the request queue.
            requestHandler: async ({ page, request, enqueueLinks }) => {
                const userDataResult = parseSchema(requestUserDataSchema, request.userData);

                /**
                 * Handle schema validation errors.
                 */
                if (!userDataResult.success) {
                    logger.error(`Target request schema validation failed for: ${request.uniqueKey}`, {
                        issues: userDataResult.issues,
                    });

                    const targetId = request?.userData?.targetId;
                    const label = request?.userData?.label;

                    if (label === constants.requestLabels.targetRequest) {
                        if (targetId) {
                            completedTargets.add(targetId);
                        }
                    } else if (label === constants.requestLabels.extractionRequest) {
                        if (targetId) {
                            // Remove the unique request key to mark its completion
                            targetToUniqueKeysMap.get(targetId)?.delete(request.uniqueKey);

                            /**
                             * Invoke onTargetFinish with complete target results.
                             */
                            const isTargetToUniqueKeysMapEmpty = targetToUniqueKeysMap.get(targetId)?.size === 0;
                            const isTargetFinished = completedTargets.has(targetId);

                            if (isTargetToUniqueKeysMapEmpty && !isTargetFinished) {
                                completedTargets.add(targetId);
                                logger.error(
                                    `Target completed but request schema validation failed: ${request.uniqueKey}`,
                                    {}
                                );
                            }
                        }
                    }

                    return;
                }

                /**
                 * Get the user data from the validated request.
                 */
                const userData = userDataResult.data;

                /**
                 * Get the target class from the target registry.
                 * If the target class is not found, invoke onTargetFinish with an error.
                 */
                const targetToCamelCase = kebabToCamelCase(userData.target);
                const target = this.getTargetFromRegistry(targetToCamelCase);

                if (!target) {
                    callbackWithTargetResults(userData, [
                        {
                            result: null,
                            error: {
                                message: `Could not find target class with name: ${targetToCamelCase}`,
                            },
                        },
                    ]);

                    completedTargets.add(userData.targetId);

                    return;
                }

                /**
                 * Process the request and get the result.
                 */
                const requestResult = await target.processRequest({ page, request, userData, enqueueLinks });

                /**
                 * Add the unique keys of all enqueued extraction requests to the "targetToUniqueKeysMap" map.
                 */
                if (requestResult.uniqueKeys) {
                    for (const uniqueKey of requestResult.uniqueKeys) {
                        // Note: "targetToUniqueKeysMap" is initialized when mapping to the initial target requests.
                        targetToUniqueKeysMap.get(userData.targetId)?.add(uniqueKey);
                    }

                    return;

                    /**
                     * Add the result to the "targetToResultsMap" map.
                     * Note: Its an extraction request when "result" is defined.
                     */
                } else if (requestResult.result) {
                    const targetResults = targetToResultsMap.get(userData.targetId);

                    // Note: "targetResults" is set when mapping to the initial target requests.
                    targetResults?.push({
                        result: requestResult.result,
                        error: null,
                    });

                    // Remove the unique request key to mark its completion
                    targetToUniqueKeysMap.get(userData.targetId)?.delete(request.uniqueKey);

                    /**
                     * Invoke onTargetFinish with complete target results.
                     */
                    const isTargetToUniqueKeysMapEmpty = targetToUniqueKeysMap.get(userData.targetId)?.size === 0;
                    const isTargetFinished = completedTargets.has(userData.targetId);

                    if (isTargetToUniqueKeysMapEmpty && !isTargetFinished) {
                        completedTargets.add(userData.targetId);
                        callbackWithTargetResults(userData, targetToResultsMap.get(userData.targetId) || []);
                    }

                    return;
                }

                /**
                 * Invoke onTargetFinish with an error when the crawler throws.
                 * Note: "result" is null and "uniqueKeys" is null when this happens.
                 */
                callbackWithTargetResults(userData, [
                    {
                        result: null,
                        error: {
                            message: `Request processing failed for target with id: ${userData.targetId}`,
                        },
                    },
                ]);

                completedTargets.add(userData.targetId);
            },
        });

        await crawler.run();
    }
}

export default Scraper;
