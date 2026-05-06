import { ExecutionToolTarget } from 'shared/types/jobs/tools/execution/types-execution';

import type { ExecutionScrapedItem } from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';
import type { ScraperTool, ScraperToolTargetName } from 'shared/types/jobs/tools/types-tools-scraper';

/**
 * Portal targets map DOM-specific markup into these shapes before building
 * execution listing `text` / `fields`. Not part of OpenAPI.
 */
type ScraperDescriptionSection = {
    title?: string;
    blocks: string[];
};

type ScraperInformationRow = {
    label: string;
    value: string;
};

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
    run(targetConfig: ScraperTargetConfig): Promise<ExecutionScrapedItem[]>;
}

export type {
    OnTargetFinish,
    ExecuteParams,
    ScraperDescriptionSection,
    ScraperInformationRow,
    ScraperTargetConfig,
    ScraperTarget,
};
