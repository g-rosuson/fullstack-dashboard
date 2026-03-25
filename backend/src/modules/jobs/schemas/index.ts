import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { validateJobSchedule } from './schemas-validators';
import { jobBaseSchema } from 'shared/schemas/jobs';

extendZodWithOpenApi(z);

/**
 * A job input schema.
 * @note spread out the jobBaseSchema instead of .extend()
 * so Orval can generate a separate schema for the createJobInput
 */
const createJobInputSchema = z
    .object({
        ...jobBaseSchema.shape,
        name: z.string(),
    })
    .superRefine(validateJobSchedule)
    .openapi('CreateJobInput');

/**
 * A job input schema for updating a job.
 * @note spread out the jobBaseSchema instead of .extend()
 * so Orval can generate a separate schema for the updateJobInput
 */
const updateJobInputSchema = z
    .object({
        ...jobBaseSchema.shape,
        name: z.string(),
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
