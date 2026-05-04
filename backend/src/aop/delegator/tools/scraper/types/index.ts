import { ExecutionToolTarget } from 'shared/types/jobs/tools/execution/types-execution';
import { ExecutionScraperTargetResult } from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import type { ScraperTool, ScraperToolTargetName } from 'shared/types/jobs/tools/types-tools-scraper';

/**
 * A function to execute a tool.
 */
// eslint-disable-next-line no-unused-vars
type OnTargetFinish = (target: ExecutionToolTarget) => void;

/**
 * Inputs to `Scraper.execute()`.
 */
interface ExecuteParams {
    tool: ScraperTool;
    onTargetFinish: OnTargetFinish;
}

/**
 * A scraper target config.
 */
interface ScraperTargetConfig {
    targetId: string;
    target: ScraperToolTargetName;
    keywords: string[];
    maxPages: number;
    totalAttempts: number;
    retryDelayMs: number;
}

/**
 * The single contract every target implements.
 */
interface ScraperTarget {
    // eslint-disable-next-line no-unused-vars
    run(targetConfig: ScraperTargetConfig): Promise<ExecutionScraperTargetResult[]>;
}

export type { OnTargetFinish, ExecuteParams, ScraperTargetConfig, ScraperTarget };
