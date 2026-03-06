import { CronJobType } from 'shared/types/jobs';

import type { Tool } from '../tools/types';

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
