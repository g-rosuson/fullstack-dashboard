import { CronJobType } from 'shared/types/cron';

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

export type { DelegationPayload };
