import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { validateJobSchedule } from './schemas-validators';
import { cronJobTypeSchema } from 'shared/schemas/cron';
import { scraperToolTargetNameSchema } from 'shared/schemas/jobs';

extendZodWithOpenApi(z);

/**
 * A scraper tool input schema.
 * @private
 */
const scraperToolInputSchema = z.object({
    type: z.literal('scraper'),
    targets: z.array(
        z.object({
            target: scraperToolTargetNameSchema,
            keywords: z.array(z.string()).min(1).optional(),
            maxPages: z.number().positive().optional(),
        })
    ),
    keywords: z.array(z.string()).min(1),
    maxPages: z.number().positive(),
});

/**
 * A job input schema.
 */
const createJobInputSchema = z
    .object({
        name: z.string(),
        schedule: z
            .object({
                type: cronJobTypeSchema,
                // Enforce strict ISO 8601 timestamp with timezone to avoid locale-dependent date parsing bugs
                startDate: z.string().datetime({ offset: true }).pipe(z.coerce.date()),
                endDate: z.string().datetime({ offset: true }).pipe(z.coerce.date()).nullable(),
            })
            .nullable(),
        tools: z.array(scraperToolInputSchema).min(1),
    })
    .superRefine(validateJobSchedule)
    .openapi('CreateJobInput');

/**
 * A job input schema for updating a job.
 */
const updateJobInputSchema = z
    .object({
        name: z.string(),
        schedule: z
            .object({
                type: cronJobTypeSchema,
                // Enforce strict ISO 8601 timestamp with timezone to avoid locale-dependent date parsing bugs
                startDate: z
                    .string()
                    .datetime({ offset: true })
                    .transform(v => new Date(v)),
                endDate: z
                    .string()
                    .datetime({ offset: true })
                    .transform(v => (v ? new Date(v) : null)),
            })
            .nullable(),
        tools: z.array(scraperToolInputSchema).min(1),
        runJob: z.boolean().optional(),
    })
    .superRefine(validateJobSchedule)
    .openapi('UpdateJobInput');

/**
 * An ID route param schema.
 */
const idRouteParamSchema = z
    .object({
        id: z.string(),
    })
    .openapi('IdRouteParam');

/**
 * A paginated route param schema.
 */
const paginatedRouteParamSchema = z
    .object({
        limit: z.string().optional(),
        offset: z.string().optional(),
    })
    .openapi('PaginatedRouteParam');

export { createJobInputSchema, updateJobInputSchema, idRouteParamSchema, paginatedRouteParamSchema };
