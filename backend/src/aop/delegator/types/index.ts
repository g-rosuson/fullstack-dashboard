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
    name: string;
    tools: Tool[];
    scheduleType: CronJobType | null;
}

/**
 * A payload for getting the tool targets with results.
 */
type TargetWithResultsPayload<T extends ToolType> = {
    executionId: string;
    jobId: string;
    userId: string;
    tool: ToolMap[T];
    schedule: ExecutionSchedule;
};

export type { DelegationPayload, TargetWithResultsPayload };
