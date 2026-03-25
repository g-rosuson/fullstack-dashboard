import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import constants from 'shared/constants';

import { exectutionToolTargetResultSchema } from '../tools/execution/schemas-execution';
import { toolTargetNameSchema } from 'shared/schemas/jobs/tools/schemas-tools';

extendZodWithOpenApi(z);

/**
 * A job target finished event type schema.
 */
const jobTargetFinishedEventTypeSchema = z.literal(constants.events.jobs.targetFinished);

/**
 * A job target finished event schema.
 */
const jobTargetFinishedEventSchema = z
    .object({
        jobId: z.string(),
        userId: z.string(),
        toolId: z.string(),
        target: toolTargetNameSchema,
        targetId: z.string(),
        results: z.array(exectutionToolTargetResultSchema),
        type: jobTargetFinishedEventTypeSchema,
    })
    .openapi('JobTargetFinishedEvent');

/**
 * A running jobs event type schema.
 */
const runningJobsEventTypeSchema = z.literal(constants.events.jobs.runningJobs);

/**
 * A running jobs event schema.
 */
const runningJobsEventSchema = z
    .object({
        runningJobs: z.array(z.string()),
        type: runningJobsEventTypeSchema,
    })
    .openapi('RunningJobsEvent');

/**
 * A job finished event type schema.
 */
const jobFinishedEventTypeSchema = z.literal(constants.events.jobs.jobFinished);

/**
 * A job finished event schema.
 */
const jobFinishedEventSchema = z
    .object({
        jobId: z.string(),
        type: jobFinishedEventTypeSchema,
    })
    .openapi('JobFinishedEvent');

/**
 * A job event schema.
 */
const jobEventSchema = z
    .discriminatedUnion('type', [jobTargetFinishedEventSchema, runningJobsEventSchema, jobFinishedEventSchema])
    .openapi('JobEvent');

export { jobTargetFinishedEventSchema, runningJobsEventSchema, jobFinishedEventSchema, jobEventSchema };
