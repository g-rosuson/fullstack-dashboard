import constants from 'shared/constants';

import { EventType, EventTypeToPayloadMap } from '../types';

import type { ZodType } from 'zod';

import {
    jobFinishedEventSchema,
    jobTargetFinishedEventSchema,
    runningJobsEventSchema,
} from 'shared/schemas/jobs/events/schemas-events';

/**
 * A map of event schemas.
 */
const eventSchemas: { [T in EventType]: ZodType<EventTypeToPayloadMap[T]> } = {
    [constants.events.jobs.targetFinished]: jobTargetFinishedEventSchema,
    [constants.events.jobs.runningJobs]: runningJobsEventSchema,
    [constants.events.jobs.jobFinished]: jobFinishedEventSchema,
};

export { eventSchemas };
