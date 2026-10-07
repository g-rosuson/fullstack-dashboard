import constants from 'shared/constants';

import type { EmitterEventMap, EventType } from '../types';
import type { ZodType } from 'zod';

import {
    aggregatedJobsEventSchema,
    jobCancelledEventSchema,
    jobFailedEventSchema,
    jobFinishedEventSchema,
    jobTargetFinishedEventSchema,
    runningJobsEventSchema,
    scheduledJobsEventSchema,
} from 'shared/schemas/jobs/events/schemas-events';
import {
    mcpAnswerEventSchema,
    mcpAnsweringEventSchema,
    mcpCallEventSchema,
    mcpErrorEventSchema,
    mcpPermissionEventSchema,
    mcpSelectingEventSchema,
    mcpStoppedEventSchema,
} from 'shared/schemas/mcp/events';

/**
 * A map of event schemas.
 */
const eventSchemas: { [T in EventType]: ZodType<EmitterEventMap[T]> } = {
    [constants.events.jobs.jobsAggregated]: aggregatedJobsEventSchema,
    [constants.events.jobs.jobTargetFinished]: jobTargetFinishedEventSchema,
    [constants.events.jobs.jobsRunning]: runningJobsEventSchema,
    [constants.events.jobs.jobsScheduled]: scheduledJobsEventSchema,
    [constants.events.jobs.jobFinished]: jobFinishedEventSchema,
    [constants.events.jobs.jobFailed]: jobFailedEventSchema,
    [constants.events.jobs.jobCancelled]: jobCancelledEventSchema,
    [constants.events.mcp.selecting]: mcpSelectingEventSchema,
    [constants.events.mcp.permission]: mcpPermissionEventSchema,
    [constants.events.mcp.call]: mcpCallEventSchema,
    [constants.events.mcp.answering]: mcpAnsweringEventSchema,
    [constants.events.mcp.answer]: mcpAnswerEventSchema,
    [constants.events.mcp.error]: mcpErrorEventSchema,
    [constants.events.mcp.stopped]: mcpStoppedEventSchema,
};

export { eventSchemas };
