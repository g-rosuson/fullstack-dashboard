import { z } from 'zod';

import constants from 'shared/constants';

import type { jobFinishedEventSchema, jobTargetFinishedEventSchema, runningJobsEventSchema } from '../schemas';

/**
 * Maps event-types to their corresponding event payload.
 */
type EventTypeToPayloadMap = {
    [constants.events.jobs.jobFinished]: z.infer<typeof jobFinishedEventSchema>;
    [constants.events.jobs.targetFinished]: z.infer<typeof jobTargetFinishedEventSchema>;
    [constants.events.jobs.runningJobs]: z.infer<typeof runningJobsEventSchema>;
};

/**
 * An event type.
 */
type EventType = keyof EventTypeToPayloadMap;

/**
 * A job target event payload.
 */
type JobTargetFinishedEvent = z.infer<typeof jobTargetFinishedEventSchema>;

export type { JobTargetFinishedEvent, EventType, EventTypeToPayloadMap };
