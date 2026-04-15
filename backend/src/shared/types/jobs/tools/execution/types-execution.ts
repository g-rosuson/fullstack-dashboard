import { z } from 'zod';

import { CronJobType } from 'shared/types/cron';

import { executionToolSchema, executionToolTargetSchema } from 'shared/schemas/jobs/tools/execution/schemas-execution';

/**
 * An union type of all execution tool targets.
 */
type ExecutionToolTarget = z.infer<typeof executionToolTargetSchema>;

/**
 * An execution tool.
 */
type ExecutionTool = z.infer<typeof executionToolSchema>;

/**
 * An execution schedule.
 */
type ExecutionSchedule = {
    type: CronJobType;
    delegatedAt: string;
    finishedAt: string | null;
};

/**
 * A execution payload.
 */
interface ExecutionPayload {
    executionId: string;
    jobId: string;
    schedule: ExecutionSchedule;
    tools: ExecutionTool[];
}

export type { ExecutionToolTarget, ExecutionPayload, ExecutionTool, ExecutionSchedule };
