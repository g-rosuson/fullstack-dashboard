import type { Aborter } from 'aop/aborter';

import { ToolMap, ToolType } from '../tools/types';
import { CronJobType } from 'shared/types/cron';
import { ExecutionSchedule } from 'shared/types/jobs/tools/execution/types-execution';

import type { Tool } from 'shared/types/jobs/tools/types-tools';

/**
 * A delegation payload.
 */
interface DelegationPayload {
    jobId: string;
    userId: string;
    tools: Tool[];
    scheduleType: CronJobType | null;
}

/**
 * A job currently executing in the Delegator, with its cancel handle.
 */
type RunningJob = {
    payload: DelegationPayload;
    aborter: Aborter;
};

/**
 * A payload for getting the tool targets with results.
 */
type TargetWithResultsPayload<T extends ToolType> = {
    executionId: string;
    jobId: string;
    userId: string;
    tool: ToolMap[T];
    schedule: ExecutionSchedule;
    signal: AbortSignal;
};

export type { DelegationPayload, RunningJob, TargetWithResultsPayload };
