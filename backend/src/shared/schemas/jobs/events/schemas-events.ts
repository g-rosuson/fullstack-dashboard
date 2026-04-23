import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import constants from 'shared/constants';

import { executionScheduleSchema, executionToolTargetSchema } from '../tools/execution/schemas-execution';
import { toolSchema } from 'shared/schemas/jobs/tools/schemas-tools';

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
        executionId: z.string(),
        tool: toolSchema,
        target: executionToolTargetSchema,
        type: jobTargetFinishedEventTypeSchema,
        schedule: executionScheduleSchema,
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
        userId: z.string().optional(),
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
        userId: z.string(),
        type: jobFinishedEventTypeSchema,
        finishedAt: z.string().datetime({ offset: true }),
        executionId: z.string(),
        lastRun: z.string().datetime({ offset: true }).nullable(),
        nextRun: z.string().datetime({ offset: true }).nullable(),
    })
    .openapi('JobFinishedEvent');

/**
 * A job failed event type schema.
 */
const jobFailedEventTypeSchema = z.literal(constants.events.jobs.jobFailed);

/**
 * A job failed event schema.
 */
const jobFailedEventSchema = z
    .object({
        jobId: z.string(),
        userId: z.string(),
        executionId: z.string(),
        type: jobFailedEventTypeSchema,
        failedAt: z.string().datetime({ offset: true }),
    })
    .openapi('JobFailedEvent');

/**
 * A job event schema.
 */
const jobEventSchema = z
    .discriminatedUnion('type', [
        jobTargetFinishedEventSchema,
        runningJobsEventSchema,
        jobFinishedEventSchema,
        jobFailedEventSchema,
    ])
    .openapi('JobEvent');

export {
    jobTargetFinishedEventSchema,
    runningJobsEventSchema,
    jobFinishedEventSchema,
    jobEventSchema,
    jobFailedEventSchema,
};
