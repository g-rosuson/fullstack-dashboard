import { z } from 'zod';

import constants from 'shared/constants';

import { EventType, EventTypeToPayloadMap } from '../types';

import type { ZodType } from 'zod';

import { scraperToolTargetNameSchema } from 'shared/schemas/jobs';

/**
 * A job target finished event schema.
 */
const jobTargetFinishedEventSchema = z.object({
    jobId: z.string(),
    userId: z.string(),
    target: scraperToolTargetNameSchema,
    targetId: z.string(),
    results: z.array(z.any()),
    type: z.literal(constants.events.jobs.targetFinished),
});

/**
 * A running jobs event schema.
 */
const runningJobsEventSchema = z.object({
    runningJobs: z.array(z.string()),
    type: z.literal(constants.events.jobs.runningJobs),
});

/**
 * A job finished event schema.
 */
const jobFinishedEventSchema = z.object({
    jobId: z.string(),
    type: z.literal(constants.events.jobs.jobFinished),
});

/**
 * A map of event schemas.
 */
const eventSchemas: { [K in EventType]: ZodType<EventTypeToPayloadMap[K]> } = {
    [constants.events.jobs.targetFinished]: jobTargetFinishedEventSchema,
    [constants.events.jobs.runningJobs]: runningJobsEventSchema,
    [constants.events.jobs.jobFinished]: jobFinishedEventSchema,
};

export { eventSchemas, jobTargetFinishedEventSchema, runningJobsEventSchema, jobFinishedEventSchema };
