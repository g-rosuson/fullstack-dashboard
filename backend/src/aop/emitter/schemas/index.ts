import constants from 'shared/constants';

import type { EventType } from '../types';
import type { EventTypeToPayloadMap } from 'shared/types/jobs/events/types-jobs-events';
import type { ZodType } from 'zod';

import {
    jobFailedEventSchema,
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
    [constants.events.jobs.jobFailed]: jobFailedEventSchema,
};

export { eventSchemas };
