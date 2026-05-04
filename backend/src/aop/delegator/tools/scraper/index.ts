import type { ExecuteParams, ScraperTarget } from './types';

import targetRegistry from './targets';
import { kebabToCamelCase } from 'utils';

const TOTAL_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const MAX_PAGES = 50;

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
                                    result: null,
                                    error: { message: `Unknown target: ${targetSettings.target}` },
                                },
                            ],
                        });
                        return;
                    }

                    // Determine target configuration based on target settings and tool settings.
                    const maxPages = targetSettings.maxPages || tool.maxPages || MAX_PAGES;

                    const targetConfig = {
                        targetId: targetSettings.targetId,
                        target: targetSettings.target,
                        keywords: targetSettings.keywords || tool.keywords || [],
                        maxPages,
                        totalAttempts: TOTAL_ATTEMPTS,
                        retryDelayMs: RETRY_DELAY_MS,
                    };

                    const results = await target.run(targetConfig);

                    onTargetFinish({ ...targetSettings, results });
                })
            );
        } catch (error) {}
    }
}

export default Scraper;
