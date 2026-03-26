import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
    executionEmailToolSchema,
    executionEmailToolTargetResultSchema,
    executionEmailToolTargetSchema,
} from './schemas-execution-email-tool';
import {
    executionScraperTargetResultSchema,
    executionScraperToolSchema,
    executionScraperToolTargetSchema,
} from './schemas-execution-scraper-tool';
import { cronJobTypeSchema } from 'shared/schemas/cron';

extendZodWithOpenApi(z);

/**
 * An execution schedule schema.
 */
const executionScheduleSchema = z
    .object({
        type: cronJobTypeSchema.nullable(),
        delegatedAt: z.string().datetime({ offset: true }),
        finishedAt: z.string().datetime({ offset: true }).nullable(),
    })
    .openapi('ExecutionSchedule');

/**
 * An execution tool target schema.
 * @note we use a union instead of a discriminated union, because the tool target name "target"
 * needs to be a .literal() or .enum().
 */
const executionToolTargetSchema = z
    .union([executionScraperToolTargetSchema, executionEmailToolTargetSchema])
    .openapi('ExecutionToolTarget');

/**
 * An execution tool schema.
 */
const executionToolSchema = z
    .discriminatedUnion('type', [executionScraperToolSchema, executionEmailToolSchema])
    .openapi('ExecutionTool');

/**
 * An execution tool target result schema.
 */
const exectutionToolTargetResultSchema = z
    .union([executionScraperTargetResultSchema, executionEmailToolTargetResultSchema])
    .openapi('ExecutionToolTargetResult');

/**
 * An execution schema.
 */
const executionSchema = z
    .object({
        schedule: executionScheduleSchema,
        tools: z.array(executionToolSchema).min(1),
    })
    .openapi('Execution');

export { executionSchema, executionToolTargetSchema, executionToolSchema, exectutionToolTargetResultSchema };
