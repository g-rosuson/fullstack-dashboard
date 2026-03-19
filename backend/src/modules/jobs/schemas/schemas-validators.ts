import { z } from 'zod';

import { ErrorMessage } from 'shared/enums/error-messages';
import { CronJobType } from 'shared/types/cron';

/**
 * Validates the job schedule.
 *
 * If: Start date is in the past, add an issue.
 * If: End date is before start date, add an issue.
 * @param payload - The job payload
 * @param ctx - The refinement context
 */
const validateJobSchedule = (
    payload: {
        schedule?: { type: CronJobType; startDate?: Date; endDate?: Date | null } | null;
    },
    ctx: z.RefinementCtx
) => {
    if (payload.schedule?.startDate && payload.schedule.startDate < new Date()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ErrorMessage.JOBS_START_DATE_IN_FUTURE,
            path: ['schedule', 'startDate'],
            fatal: true,
        });
    }

    if (
        payload.schedule?.endDate &&
        payload.schedule?.startDate &&
        payload.schedule.startDate > payload.schedule.endDate
    ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ErrorMessage.JOBS_START_DATE_COME_BEFORE_END_DATE,
            path: ['schedule', 'startDate'],
            fatal: true,
        });
    }

    if (payload.schedule?.type === 'once' && payload.schedule?.endDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: ErrorMessage.JOBS_ONCE_TYPE_CANNOT_HAVE_END_DATE,
            path: ['schedule', 'endDate'],
            fatal: true,
        });
    }
};

export { validateJobSchedule };
