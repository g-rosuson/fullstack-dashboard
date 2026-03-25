import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { emailToolSchema, emailToolTargetSchema } from '../tools/schemas-tools-email';

extendZodWithOpenApi(z);

/**
 * A execution email tool target schema.
 */
const executionEmailToolTargetSchema = z
    .object({
        ...emailToolTargetSchema.shape,
        results: z.array(z.unknown()),
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
