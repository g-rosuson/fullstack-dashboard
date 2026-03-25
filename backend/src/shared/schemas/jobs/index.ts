import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { cronJobTypeSchema } from '../cron';
import { toolSchema } from './tools/schemas-tools';

extendZodWithOpenApi(z);

/**
 * A job schedule schema.
 */
const jobScheduleSchema = z
    .object({
        type: cronJobTypeSchema,
        // Enforce strict ISO 8601 timestamp with timezone (e.g. 2024-01-01T10:00:00Z or +02:00)
        // - Prevents locale-dependent parsing issues (e.g. DD/MM vs MM/DD)
        // - Guarantees timezone is explicitly defined (no implicit local time)
        startDate: z.string().datetime({ offset: true }),
        endDate: z.string().datetime({ offset: true }).nullable(),
    })
    .openapi('JobSchedule');

/**
 * A job schema.
 */
const jobBaseSchema = z
    .object({
        schedule: jobScheduleSchema.nullable(),
        tools: z.array(toolSchema).min(1),
    })
    .openapi('JobBase');

export { jobBaseSchema, jobScheduleSchema };
