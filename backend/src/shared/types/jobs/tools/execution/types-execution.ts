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
 * A execution payload.
 */
interface ExecutionPayload {
    jobId: string;
    schedule: {
        type: CronJobType;
        delegatedAt: string;
        finishedAt: string | null;
    };
    tools: ExecutionTool[];
}

export type { ExecutionToolTarget, ExecutionPayload, ExecutionTool };
