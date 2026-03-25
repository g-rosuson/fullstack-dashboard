import { ScheduledTask } from 'node-cron';

import { CronJobType } from 'shared/types/cron';

interface FormatCronExpressionPayload {
    startDate: Date;
    type: Exclude<CronJobType, 'once'>;
}

interface SchedulePayload {
    jobId: string;
    name: string;
    type: CronJobType;
    startDate: string;
    endDate: string | null;
}

interface CronJob {
    jobId: string;
    cronExpression: string | undefined;
    startDate: Date;
    endDate: Date | null;
    cronTask: ScheduledTask | undefined;
    metadata: {
        startTimeoutId: NodeJS.Timeout | undefined;
        stopTimeoutId: NodeJS.Timeout | undefined;
    };
}

interface NextAndPreviousRunPayload {
    nextRun: Date | null;
    previousRun: Date | null;
}

export type { CronJob, SchedulePayload, FormatCronExpressionPayload, NextAndPreviousRunPayload };
