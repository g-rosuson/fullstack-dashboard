import { logger } from 'aop/logging';

import constants from './constants';
import mappers from './mappers';

import type { ExecuteParams, ScraperTarget, ScraperTargetConfig } from './types';

import { listingKeyFrom } from './helpers';
import targetRegistry from './targets';
import { kebabToCamelCase } from 'utils';

/**
 * Scraper orchestrator.
 *
 * Responsibilities, in order of precedence:
 * 1. Launch and tear down the chromium browser (one per `execute` call).
 * 2. For each configured target:
 *    - Resolve it from the registry (kebab-case → camelCase lookup).
 *    - Build a per-target `BrowserContext` so cookies/storage are isolated.
 *    - Build a primary `Page` and a `TargetContext` runtime API.
 *    - Invoke `target.run(ctx)` — the target is free to scrape however it wants.
 *    - Aggregate `emit` / `emitError` results plus any thrown errors.
 *    - Fire `onTargetFinish` exactly once with the accumulated results.
 *
 * Targets run concurrently via `Promise.allSettled` so that one target's
 * catastrophic failure (e.g. browser context creation throws) cannot leak the
 * browser process or prevent sibling targets from finishing.
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
     * Execute the scraper tool — runs all configured targets concurrently and
     * fires `onTargetFinish` once per target.
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
                                        listingKey: listingKeyFrom(
                                            targetSettings.target,
                                            'scraper:error:unknown-target'
                                        ),
                                        source: targetSettings.target,
                                        url: '',
                                        error: {
                                            code: 'UNKNOWN_TARGET',
                                            message: `Unknown target: ${targetSettings.target}`,
                                        },
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    /**
                     * Map the keywords and max pages from the target and tool to a single array and number.
                     */
                    const keywords = mappers.mapToKeywords(targetSettings.keywords, tool.keywords);
                    const maxPages = mappers.mapToMaxPages(targetSettings.maxPages, tool.maxPages);

                    if (!keywords || typeof maxPages !== 'number') {
                        const message = keywords ? 'Invalid max pages' : 'Invalid keywords';
                        onTargetFinish({
                            ...targetSettings,
                            results: [
                                {
                                    listing: {
                                        ok: false,
                                        listingKey: listingKeyFrom(
                                            targetSettings.target,
                                            'scraper:error:invalid-config'
                                        ),
                                        source: targetSettings.target,
                                        url: '',
                                        error: {
                                            code: 'INVALID_CONFIG',
                                            message,
                                        },
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    const targetConfig: ScraperTargetConfig = {
                        targetId: targetSettings.targetId,
                        target: targetSettings.target,
                        keywords,
                        maxPages,
                        totalAttempts: constants.TOTAL_ATTEMPTS,
                        retryDelayMs: constants.RETRY_DELAY_MS,
                    };

                    const listings = await target.run(targetConfig);

                    onTargetFinish({ ...targetSettings, results: listings.map(listing => ({ listing })) });
                })
            );
        } catch (error) {
            logger.error('Failed to execute scraper tool', { error: error as Error });
        }
    }
}

export default Scraper;
