import { z } from 'zod';

import type { ToolWithTargetResults } from 'aop/delegator/tools/types';

import { cronJobTypeSchema } from 'shared/schemas/cron';

/**
 * A execution payload.
 * @note Used in job db repository and delegator.
 */
interface ExecutionPayload {
    jobId: string;
    schedule: {
        type: z.infer<typeof cronJobTypeSchema> | null;
        delegatedAt: Date;
        finishedAt: Date | null;
    };
    tools: ToolWithTargetResults[];
}

export type { ExecutionPayload };
