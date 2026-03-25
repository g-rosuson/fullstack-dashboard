import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { jobScheduleSchema } from 'shared/schemas/jobs';
import { executionSchema } from 'shared/schemas/jobs/execution/schemas-execution';
import { toolSchema } from 'shared/schemas/jobs/tools/schemas-tools';

extendZodWithOpenApi(z);

/**
 * A job document schema.
 */
const jobDocumentSchema = z
    .object({
        _id: z.instanceof(ObjectId),
        userId: z.instanceof(ObjectId),
        name: z.string(),
        tools: z.array(toolSchema).min(1),
        schedule: jobScheduleSchema.nullable(),
        createdAt: z.string().datetime({ offset: true }),
        updatedAt: z.string().datetime({ offset: true }).nullable(),
        executions: z.array(executionSchema).optional(),
    })
    .openapi('JobDocument');

export { jobDocumentSchema };
