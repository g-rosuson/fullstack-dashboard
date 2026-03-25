import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { emailToolSchema, emailToolTargetSchema } from '../schemas-tools-email';
import { targetErrorResultSchema } from '../schemas-tools-error';

extendZodWithOpenApi(z);

/**
 * A execution email tool target result content schema.
 */
const executionEmailToolTargetResultContentSchema = z
    .object({
        email: z.string(),
        subject: z.string(),
        body: z.string(),
    })
    .nullable()
    .openapi('ExecutionEmailToolTargetResultContent');

/**
 * A execution email tool target result schema.
 */
const executionEmailToolTargetResultSchema = z
    .object({
        error: targetErrorResultSchema.nullable(),
        result: executionEmailToolTargetResultContentSchema.nullable(),
    })
    .openapi('ExecutionEmailToolTargetResult');

/**
 * A execution email tool target schema.
 */
const executionEmailToolTargetSchema = z
    .object({
        ...emailToolTargetSchema.shape,
        results: z.array(executionEmailToolTargetResultSchema),
    })
    .openapi('ExecutionEmailToolTarget');

/**
 * A execution email tool schema.
 */
const executionEmailToolSchema = z
    .object({
        ...emailToolSchema.shape,
        targets: z.array(executionEmailToolTargetSchema),
    })
    .openapi('ExecutionEmailTool');

export { executionEmailToolTargetSchema, executionEmailToolSchema };
