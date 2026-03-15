import { z } from 'zod';

import type { ToolWithTargetResults } from 'aop/delegator/tools/types';

import { cronJobTypeSchema } from 'shared/schemas/jobs';
/**
 * A cron job type.
 * @note Used in job db repository, delegator, scheduler and jobs module.
 */
type CronJobType = z.infer<typeof cronJobTypeSchema>;

/**
 * A execution payload.
 * @note Used in job db repository and delegator.
 */
interface ExecutionPayload {
    jobId: string;
    schedule: {
        type: CronJobType | null;
        delegatedAt: Date;
        finishedAt: Date | null;
    };
    tools: ToolWithTargetResults[];
}

export type { CronJobType, ExecutionPayload };
