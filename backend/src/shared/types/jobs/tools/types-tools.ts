import { z } from 'zod';

import {
    toolSchema,
    toolTargetNameSchema,
    toolTargetSchema,
    toolTypeSchema,
} from 'shared/schemas/jobs/tools/schemas-tools';

/**
 * A tool target name.
 */
type ToolTargetName = z.infer<typeof toolTargetNameSchema>;

/**
 * A tool type.
 */
type ToolType = z.infer<typeof toolTypeSchema>;

/**
 * An union type of all tools.
 */
type Tool = z.infer<typeof toolSchema>;

/**
 * An union type of all tool targets.
 */
type ToolTarget = z.infer<typeof toolTargetSchema>;

export type { Tool, ToolTargetName, ToolType, ToolTarget };
