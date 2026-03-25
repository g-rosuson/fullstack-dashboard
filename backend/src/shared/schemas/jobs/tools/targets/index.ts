import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import constants from 'shared/constants';

import { toolTargetNameSchema } from 'shared/schemas/jobs/tools/schemas-tools';

extendZodWithOpenApi(z);

/**
 * A job target finished event type schema.
 */
const jobTargetFinishedEventTypeSchema = z
    .literal(constants.events.jobs.targetFinished)
    .openapi('JobTargetFinishedEventType');

/**
 * A job target finished event schema.
 */
const jobTargetFinishedEventSchema = z
    .object({
        jobId: z.string(),
        userId: z.string(),
        target: toolTargetNameSchema,
        targetId: z.string(),
        // TODO: This has to be an array of results since a target can have multiple results.
        // TODO: Only executions have results, this is the same result? Does it matter?
        // TODO: delegator.getToolTargetsWithResults uses the execution tool and emits
        results: z.array(z.any()),
        type: jobTargetFinishedEventTypeSchema,
    })
    .openapi('JobTargetFinishedEvent');

/**
 * A running jobs event type schema.
 */
const runningJobsEventTypeSchema = z.literal(constants.events.jobs.runningJobs).openapi('RunningJobsEventType');

/**
 * A running jobs schema.
 */
const runningJobsSchema = z.array(z.string()).openapi('RunningJobs');

/**
 * A running jobs event schema.
 */
const runningJobsEventSchema = z
    .object({
        runningJobs: runningJobsSchema,
        type: runningJobsEventTypeSchema,
    })
    .openapi('RunningJobsEvent');

/**
 * A job finished event type schema.
 */
const jobFinishedEventTypeSchema = z.literal(constants.events.jobs.jobFinished).openapi('JobFinishedEventType');

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
const jobEventSchema = z.discriminatedUnion('type', [
    jobTargetFinishedEventSchema,
    runningJobsEventSchema,
    jobFinishedEventSchema,
]);

export { jobTargetFinishedEventSchema, runningJobsEventSchema, jobFinishedEventSchema, jobEventSchema };
