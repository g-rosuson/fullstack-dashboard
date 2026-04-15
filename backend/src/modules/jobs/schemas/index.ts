import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { validateJobSchedule } from './schemas-validators';
import { jobScheduleSchema } from 'shared/schemas/jobs';
import { emailToolSchema, emailToolTargetSchema } from 'shared/schemas/jobs/tools/schemas-tools-email';
import { scraperToolSchema, scraperToolTargetSchema } from 'shared/schemas/jobs/tools/schemas-tools-scraper';

extendZodWithOpenApi(z);

/**
 * A create scraper tool schema.
 */
const createScraperToolSchema = scraperToolSchema
    .omit({ toolId: true })
    .extend({
        targets: z.array(scraperToolTargetSchema.omit({ targetId: true })),
    })
    .openapi('CreateScraperTool');

/**
 * A create email tool schema.
 */
const createEmailToolSchema = emailToolSchema
    .omit({ toolId: true })
    .extend({
        targets: z.array(emailToolTargetSchema.omit({ targetId: true })),
    })
    .openapi('CreateEmailTool');

/**
 * A create job tool schema.
 */
const createJobToolSchema = z
    .discriminatedUnion('type', [createScraperToolSchema, createEmailToolSchema])
    .openapi('CreateJobTool');

/**
 * A job input schema.
 */
const createJobInputSchema = z
    .object({
        schedule: jobScheduleSchema.nullable(),
        tools: z.array(createJobToolSchema),
        name: z.string(),
    })
    .superRefine(validateJobSchedule)
    .openapi('CreateJobInput');

/**
 * A update job scraper target schema.
 */
const updateJobScraperTargetSchema = z
    .object({
        ...scraperToolTargetSchema.shape,
        targetId: z.string().optional(),
    })
    .openapi('UpdateJobScraperTarget');

/**
 * A update job scraper tool schema.
 */
const updateJobScraperToolSchema = z
    .object({
        ...scraperToolSchema.shape,
        toolId: z.string().optional(),
        targets: z.array(updateJobScraperTargetSchema),
    })
    .openapi('UpdateJobScraperTool');

/**
 * A update job email target schema.
 */
const updateJobEmailTargetSchema = z
    .object({
        ...emailToolTargetSchema.shape,
        targetId: z.string().optional(),
    })
    .openapi('UpdateJobEmailTarget');

/**
 * A update job email tool schema.
 */
const updateJobEmailToolSchema = z
    .object({
        ...emailToolSchema.shape,
        toolId: z.string().optional(),
        targets: z.array(updateJobEmailTargetSchema),
    })
    .openapi('UpdateJobEmailTool');

/**
 * A update job tool schema.
 */
const updateJobToolSchema = z
    .discriminatedUnion('type', [updateJobScraperToolSchema, updateJobEmailToolSchema])
    .openapi('UpdateJobTool');

/**
 * A job input schema for updating a job.
 */
const updateJobInputSchema = z
    .object({
        schedule: jobScheduleSchema.nullable(),
        tools: z.array(updateJobToolSchema),
        name: z.string(),
        runJob: z.boolean(),
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

export {
    createJobInputSchema,
    createJobToolSchema,
    updateJobInputSchema,
    updateJobToolSchema,
    idRouteParamSchema,
    paginatedRouteParamSchema,
};
