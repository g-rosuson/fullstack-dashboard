import type { ToolTarget } from 'aop/delegator/tools/types';

/**
 * A job target event type.
 */
type JobTargetEventType = 'job-target-finished';

/**
 * An event type.
 */
type EventType = JobTargetEventType;

/**
 * A job target event.
 */
interface JobTargetEvent extends ToolTarget {
    jobId: string;
    userId: string;
}

// eslint-disable-next-line no-unused-vars
type EmitterCallback = (event: JobTargetEvent) => void;

export type { EmitterCallback, JobTargetEvent, EventType };
