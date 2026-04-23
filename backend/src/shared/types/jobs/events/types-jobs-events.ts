import { z } from 'zod';

import constants from 'shared/constants';

import type {
    jobFailedEventSchema,
    jobFinishedEventSchema,
    jobTargetFinishedEventSchema,
    runningJobsEventSchema,
} from 'shared/schemas/jobs/events/schemas-events';

/**
 * Maps event-types to their corresponding event payload.
 */
type EventTypeToPayloadMap = {
    [constants.events.jobs.jobFinished]: z.infer<typeof jobFinishedEventSchema>;
    [constants.events.jobs.targetFinished]: z.infer<typeof jobTargetFinishedEventSchema>;
    [constants.events.jobs.runningJobs]: z.infer<typeof runningJobsEventSchema>;
    [constants.events.jobs.jobFailed]: z.infer<typeof jobFailedEventSchema>;
};

export type { EventTypeToPayloadMap };
