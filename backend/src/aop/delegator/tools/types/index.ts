import { EmailTool } from 'shared/types/jobs/tools/types-tools-email';
import { ScraperTool } from 'shared/types/jobs/tools/types-tools-scraper';

import type { ExecutionToolTarget } from 'shared/types/jobs/tools/execution/types-execution';

/**
 * Maps tool type keys to their corresponding tool implementations.
 * Used for type-safe tool resolution based on discriminated union types.
 */
type ToolMap = {
    scraper: ScraperTool;
    email: EmailTool;
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
 * A function to execute a tool.
 */
// eslint-disable-next-line no-unused-vars
type OnTargetFinish = (target: ExecutionToolTarget) => void;

/**
 * A function to execute a tool.
 */
/* eslint-disable no-unused-vars */
type ExecuteFunction<T extends ToolType> = ({
    tool,
    onTargetFinish,
}: {
    tool: ToolMap[T];
    onTargetFinish: OnTargetFinish;
}) => Promise<void>;

export type { OnTargetFinish, ToolMap, ToolRegistry, ToolType };
