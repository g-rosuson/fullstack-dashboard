import type { ToolTarget } from 'aop/delegator/tools/types';

/**
 * Maps event-types to their corresponding event payload.
 */
type EventTypeToPayloadMap = {
    'job-finished': {
        jobId: string;
    };
    'job-target-finished': Pick<ToolTarget, 'results' | 'target' | 'targetId'> & {
        jobId: string;
        userId: string;
    };
};

/**
 * An event type.
 */
type EventType = keyof EventTypeToPayloadMap;

/**
 * A job target event payload.
 */
type JobTargetFinishedEvent = EventTypeToPayloadMap['job-target-finished'];

export type { JobTargetFinishedEvent, EventType, EventTypeToPayloadMap };
