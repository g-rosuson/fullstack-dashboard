import type {
    ScraperResult,
    ScraperTool,
    ScraperToolTarget,
    ScraperToolTargetName,
    ScraperToolWithResults,
} from '../scraper/types';

/**
 * A tool target name.
 */
type ToolTargetName = ScraperToolTargetName;

/**
 * An union type of all tool targets.
 */
type ToolTarget = ScraperToolTarget;

/**
 * An union type of all tools.
 */
type Tool = ScraperTool;

/**
 * A tool with results.
 */
type ToolWithTargetResults = ScraperToolWithResults;

/**
 * Maps tool type keys to their corresponding tool implementations.
 * Used for type-safe tool resolution based on discriminated union types.
 */
type ToolMap = {
    scraper: ScraperTool;
};

/**
 * Union type of all available tool type keys.
 */
type ToolType = keyof ToolMap;

/**
 * Registry structure mapping each tool type to its execution function.
 * Used to dynamically resolve and execute the appropriate tool handler.
 */
type ToolRegistry = {
    [Key in keyof ToolMap]: {
        execute: ExecuteFunction<Key>;
    };
};

/**
 * A target result, with an union type of all results.
 */
interface TargetResult {
    target: ToolTargetName;
    keywords: string[] | null;
    maxPages: number | null;
    targetId: string;
    results: ScraperResult[];
}

/**
 * A function to execute a tool.
 */
/* eslint-disable no-unused-vars */
type ExecuteFunction<T extends ToolType> = ({
    tool,
    onTargetFinish,
}: {
    tool: ToolMap[T];
    onTargetFinish: (target: ToolTarget) => void;
}) => Promise<void>;

export type {
    ExecuteFunction,
    ToolMap,
    ToolTarget,
    Tool,
    ToolWithTargetResults,
    ToolType,
    ToolRegistry,
    TargetResult,
    ToolTargetName,
};
