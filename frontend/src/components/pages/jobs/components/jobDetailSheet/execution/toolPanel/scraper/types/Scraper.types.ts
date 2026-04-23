import type { ExecutionScraperTool, ExecutionScraperToolTarget } from '@/_types/_gen';

/**
 * The props for the ScraperTarget component.
 */
interface ScraperTargetProps {
    target: ExecutionScraperToolTarget;
}

/**
 * A row for the ScraperTarget component.
 */
interface ScraperTargetRow {
    title: string | null;
    url: string | null;
}

/**
 * The props for the ScraperToolPanel component.
 */
interface ScraperToolPanelProps {
    tool: ExecutionScraperTool;
}

export type { ScraperTargetProps, ScraperTargetRow, ScraperToolPanelProps };
