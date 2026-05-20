import { logger } from 'aop/logging';

import constants from './constants';
import mappers from './mappers';

import {
    ExecutionScraperToolTargetListing,
    ExecutionScraperToolTargetResult,
    ExecutionScraperToolTargetScreen,
} from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import type {
    ExecuteParams,
    FilterSummary,
    ScraperScreenConfiguration,
    ScraperTarget,
    ScraperTargetConfig,
} from './types';

import targetRegistry from './targets';
import { kebabToCamelCase } from 'utils';

/**
 * Scraper orchestrator — coordinates targets, screens listings, and reports summaries.
 *
 * Responsibilities, in order of precedence:
 * 1. For each configured target (concurrently via `Promise.allSettled`):
 *    - Resolve it from the registry (kebab-case → camelCase lookup).
 *    - Merge tool- and target-level `keywords` / `maxPages`; fail fast on invalid config.
 *    - Invoke `target.run(targetConfig)` — each target owns Playwright lifecycle and scraping.
 * 2. Run a deterministic **screen** on every listing (`buildScreen`) before persistence:
 *    title/text presence, minimum text length, and keyword match (diacritic-insensitive).
 * 3. Aggregate per-target **summary** counts (`buildSummary`: passed, rejected, reason histogram).
 * 4. Fire `onTargetFinish` once per target with `{ results, summary }` (or error placeholders).
 *
 * Browser launch/teardown lives inside individual targets, not here, so one target's
 * Playwright failure cannot block siblings from finishing.
 */
class Scraper {
    /**
     * Resolves a target from the registry with own-key restriction so we don't
     * accidentally hit prototype methods like `toString`.
     */
    private getTargetFromRegistry(targetName: string): ScraperTarget | null {
        const camel = kebabToCamelCase(targetName);

        if (!Object.hasOwn(targetRegistry, camel)) {
            return null;
        }

        return targetRegistry[camel as keyof typeof targetRegistry];
    }

    /**
     * Builds pass/reject totals and a histogram of screen `reasonCodes` for one target run.
     */
    private buildSummary(results: ExecutionScraperToolTargetResult[]): FilterSummary {
        const summary = {
            total: results.length,
            passed: 0,
            rejected: 0,
            reasonCounts: new Map<string, number>(),
        };

        for (const result of results) {
            for (const code of result.screen?.reasonCodes || []) {
                summary.reasonCounts.set(code, (summary.reasonCounts.get(code) || 0) + 1);
            }

            if (result.screen?.passed) {
                summary.passed += 1;
            } else {
                summary.rejected += 1;
            }
        }

        return {
            ...summary,
            reasonCounts: Object.fromEntries(summary.reasonCounts),
        };
    }

    /**
     * Deterministic pre-LLM screen for a scraped listing.
     *
     * Failed listings (`ok: false`) are rejected with `LISTING_ERROR`. Successful listings
     * must have a non-empty title, text at least `minTextLength`, and at least one configured
     * keyword in title or body (NFKD-normalized, case- and diacritic-insensitive). All
     * violations are collected; `passed` is true only when `reasonCodes` is empty.
     */
    private buildScreen(
        listing: ExecutionScraperToolTargetListing,
        configuration: ScraperScreenConfiguration
    ): ExecutionScraperToolTargetScreen {
        const normalizeText = (text: string): string => {
            return text
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
        };

        const reasonCodes = [];

        if (listing.ok === false) {
            reasonCodes.push(constants.error.invalidListing.code);
            return { passed: false, reasonCodes };
        }

        const title = listing.title;
        const text = listing.text;

        if (title.trim().length === 0) {
            reasonCodes.push(constants.error.invalidTitle.code);
        }

        if (text.trim().length < configuration.minTextLength) {
            reasonCodes.push(constants.error.invalidText.code);
        }

        const normalizedTitle = normalizeText(title);
        const normalizedText = normalizeText(text);

        const areKeywordsInTitle = configuration.keywords.some(keyword => {
            const normalizedKeyword = normalizeText(keyword);
            return normalizedTitle.includes(normalizedKeyword);
        });

        const areKeywordsInText = configuration.keywords.some(keyword => {
            const normalizedKeyword = normalizeText(keyword);
            return normalizedText.includes(normalizedKeyword);
        });

        if (!areKeywordsInTitle && !areKeywordsInText) {
            reasonCodes.push(constants.error.invalidKeywordsInContent.code);
        }

        return { passed: reasonCodes.length === 0, reasonCodes };
    }

    /**
     * Execute the scraper tool.
     *
     * Runs every `tool.targets` entry concurrently. Each completion calls `onTargetFinish`
     * with screened `results` and a `summary`. Unknown targets and invalid configuration
     * emit a single error listing plus an empty summary (`constants.summary`).
     */
    async execute({ tool, onTargetFinish }: ExecuteParams): Promise<void> {
        try {
            await Promise.allSettled(
                tool.targets.map(async targetSettings => {
                    const target = this.getTargetFromRegistry(targetSettings.target);

                    if (!target) {
                        onTargetFinish({
                            ...targetSettings,
                            results: [
                                {
                                    listing: {
                                        ok: false,
                                        source: targetSettings.target,
                                        url: null,
                                        error: {
                                            code: constants.error.unknownTarget.code,
                                            message: `${constants.error.unknownTarget.message}: ${targetSettings.target}`,
                                        },
                                    },
                                },
                            ],
                            summary: constants.summary,
                        });
                        return;
                    }

                    const keywords = mappers.mapToKeywords(targetSettings.keywords, tool.keywords);
                    const maxPages = mappers.mapToMaxPages(targetSettings.maxPages, tool.maxPages);

                    if (!keywords || typeof maxPages !== 'number') {
                        onTargetFinish({
                            ...targetSettings,
                            results: [
                                {
                                    listing: {
                                        ok: false,
                                        source: targetSettings.target,
                                        url: null,
                                        error: {
                                            code: constants.error.invalidConfiguration.code,
                                            message: constants.error.invalidConfiguration.message,
                                        },
                                    },
                                },
                            ],
                            summary: constants.summary,
                        });
                        return;
                    }

                    const targetConfig: ScraperTargetConfig = {
                        targetId: targetSettings.targetId,
                        target: targetSettings.target,
                        keywords,
                        maxPages,
                        totalAttempts: constants.listing.totalAttempts,
                        retryDelayMs: constants.listing.retryDelayMs,
                    };

                    const listings = await target.run(targetConfig);
                    const results: ExecutionScraperToolTargetResult[] = [];
                    const configuration = {
                        keywords,
                        minTextLength: constants.listing.minTextLength,
                    };

                    for (const listing of listings) {
                        results.push({
                            listing,
                            screen: this.buildScreen(listing, configuration),
                        });
                    }

                    const summary = this.buildSummary(results);

                    onTargetFinish({ ...targetSettings, results, summary });
                })
            );
        } catch (error) {
            logger.error('Failed to execute scraper tool', { error: error as Error });
        }
    }
}

export default Scraper;
