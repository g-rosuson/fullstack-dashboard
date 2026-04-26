import cron from 'node-cron';

import { Delegator } from 'aop/delegator';
import { InternalException } from 'aop/exceptions';
import { logger } from 'aop/logging';

import {
    CronJob,
    FormatCronExpressionPayload,
    NextAndPreviousRunPayload,
    NextRunFromPersistedSchedulePayload,
    SchedulePayload,
} from './types';

import parser from 'cron-parser';

/**
 * Singleton scheduler service that manages cron jobs using node-cron.
 * Provides a API for cron job lifecycle management.
 * @todo Add tests
 */
export class Scheduler {
    private static instance: Scheduler;
    public cronJobs: Map<string, CronJob> = new Map();

    private constructor() {}

    /**
     * Returns the singleton instance of the Scheduler.
     * Creates a new instance if one doesn't exist.
     */
    static getInstance(): Scheduler {
        if (!Scheduler.instance) {
            Scheduler.instance = new Scheduler();
        }

        return Scheduler.instance;
    }

    /**
     * Returns the next calendar instant that matches `cronExpression`, using the same
     * `cron-parser` window as {@link schedule} / {@link getNextAndPreviousRun}.
     *
     * `cron-parser` requires `next()` to be strictly after `currentDate`. When `now` is
     * before `anchorStartDate`, `currentDate` is set to one millisecond before the anchor
     * (clamped to epoch) so the first match can be exactly `anchorStartDate`.
     *
     * @param params - Parsed recurring rule and bounds
     * @param params.cronExpression - Five-field cron string (aligned with `node-cron`)
     * @param params.anchorStartDate - Original schedule start; defines the “not yet started” branch above
     * @param params.endDate - If set, passed to `cron-parser` as `endDate` (no match after this)
     * @param params.logContextJobId - If provided, logs parse/`next()` failures for that job id
     * @returns Next run as `Date`, or `null` when there is no valid next occurrence or an error occurs
     */
    private getNextRunDate(params: {
        cronExpression: string;
        anchorStartDate: Date;
        endDate: Date | null;
        logContextJobId?: string;
    }): Date | null {
        const { cronExpression, anchorStartDate, endDate, logContextJobId } = params;

        try {
            const now = new Date();

            /**
             * cron-parser's `next()` is strictly greater than `currentDate`.
             * If we pass `startDate` exactly for not-yet-started jobs, the first
             * computed run skips to the next interval (e.g. next day for daily).
             * Use one millisecond before startDate so the first `next()` can be
             * the startDate itself. Clamp to epoch to avoid negative timestamps.
             */
            const nextCurrentDate = now < anchorStartDate ? new Date(Math.max(0, anchorStartDate.getTime() - 1)) : now;

            const nextInterval = parser.parse(cronExpression, {
                currentDate: nextCurrentDate,
                endDate: endDate ?? undefined,
            });

            return nextInterval.next().toDate();
        } catch (error) {
            if (logContextJobId !== undefined) {
                logger.error(`Error computing next run for job "${logContextJobId}":`, { error: error as Error });
            }

            return null;
        }
    }

    /**
     * Next run for a persisted recurring schedule when no CronJob exists in memory yet (e.g. server restart).
     */
    public getNextRunFromPersistedSchedule(payload: NextRunFromPersistedSchedulePayload): Date | null {
        const startDate = new Date(payload.startDate);
        const endDate = payload.endDate ? new Date(payload.endDate) : null;

        const cronExpression = this.formatCronExpression({ startDate, type: payload.type });
        if (!cronExpression) {
            return null;
        }

        if (!cron.validate(cronExpression)) {
            return null;
        }

        return this.getNextRunDate({
            cronExpression,
            anchorStartDate: startDate,
            endDate,
        });
    }

    /**
     * Gets the next and previous run dates for a cron job.
     * @param jobId - The id of the cron job to get the next and previous run for
     * @returns The next and previous run dates for the cron job
     */
    public getNextAndPreviousRun(jobId: string): NextAndPreviousRunPayload {
        try {
            const cronJob = this.cronJobs.get(jobId);
            const now = new Date();
            let nextRun: Date | null = null;
            let previousRun: Date | null = null;

            if (!cronJob) {
                return { nextRun, previousRun };
            }

            if (!cronJob.cronExpression) {
                return { nextRun, previousRun };
            }

            // Next run first so `parser.parse` call order matches `prev` below (tests rely on two parses).
            nextRun = this.getNextRunDate({
                cronExpression: cronJob.cronExpression,
                anchorStartDate: cronJob.startDate,
                endDate: cronJob.endDate,
                logContextJobId: jobId,
            });

            const prevInterval = parser.parse(cronJob.cronExpression, {
                currentDate: now,
                startDate: cronJob.startDate,
            });

            // Calling prev() can throw if there is no previous occurrence within the defined start/end range,
            // or if the cron expression is invalid.
            try {
                previousRun = prevInterval.prev().toDate();
            } catch (error) {
                // Note: Errors are expected here the first time a job with a schedule is processed,
                // therefore we skip logging an error to not pollute the logs.
            }

            return { nextRun, previousRun };
        } catch (error) {
            logger.error(`Error computing next/previous run for job "${jobId}":`, { error: error as Error });
            return { nextRun: null, previousRun: null };
        }
    }

    /**
     * Formats a cron expression based on the job's type and schedule.
     * Supports daily, weekly, monthly, and yearly recurrence patterns.
     *
     * @param payload - The cron job payload containing schedule information
     * @returns A cron expression string in the format: "minute hour day-of-month month day-of-week"
     */
    private formatCronExpression({ startDate, type }: FormatCronExpressionPayload) {
        const minute = startDate.getMinutes();
        const hour = startDate.getHours();
        const monthDay = startDate.getDate();
        const month = startDate.getMonth() + 1;
        const weekday = startDate.getDay();

        // Cron format: minute hour day-of-month month day-of-week
        switch (type) {
            case 'daily':
                // Run every day at specified time
                return `${minute} ${hour} * * *`;

            case 'weekly':
                // Run every week on the day specified in startDate at specified time
                return `${minute} ${hour} * * ${weekday}`;

            case 'monthly':
                // Run every month on the day specified in startDate at specified time
                return `${minute} ${hour} ${monthDay} * *`;

            case 'yearly':
                // Run every year on the date specified in startDate at specified time
                // Note: weekday is '*' because we want the specific calendar date, not a weekday-based rule
                return `${minute} ${hour} ${monthDay} ${month} *`;
        }
    }

    /**
     * Schedules a new cron job or updates an existing one. If a job with the
     * same ID already exists, it will be destroyed and replaced. Use this
     * method to create, restart, and update cron jobs.
     *
     * Note: We assume that the controller has validated that the start date is in the future
     *
     * The job will:
     * - Schedule to start at startDate in the future
     * - Schedule to stop at endDate if defined
     * - Run indefinitely if endDate is not defined
     *
     * @param payload - The cron job payload
     */
    public schedule(payload: SchedulePayload): void {
        const jobId = payload.jobId;
        const startDate = new Date(payload.startDate);
        const endDate = payload.endDate ? new Date(payload.endDate) : null;
        const now = new Date();

        // Delete an existing job and task if it exists
        const cronJob = this.cronJobs.get(jobId);

        if (cronJob) {
            // Delete the job from map and clear any pending timeouts
            this.delete(jobId);
        }

        // Get an instance of the delegator
        const delegator = Delegator.getInstance();

        // For 'once' jobs, we don't need a cronTask or cronExpression
        const isOfTypeOnce = payload.type === 'once';
        let cronTask: ReturnType<typeof cron.createTask> | undefined;
        let cronExpression: string | undefined;

        if (payload.type !== 'once') {
            // Format the cron expression and create task only for recurring jobs
            cronExpression = this.formatCronExpression({ startDate, type: payload.type });

            if (!cronExpression) {
                throw new InternalException(`Cron expression is undefined for job: ${payload.jobId}`);
            }

            // Validate the cron expression
            const isValid = cron.validate(cronExpression);

            if (!isValid) {
                throw new InternalException(`Invalid cron expression: ${cronExpression}`);
            }

            cronTask = cron.createTask(cronExpression, () => {
                delegator.delegateScheduledJob(jobId);
            });
        }

        const newCronJob: CronJob = {
            jobId,
            cronExpression,
            startDate,
            endDate,
            cronTask,
            metadata: {
                startTimeoutId: undefined,
                stopTimeoutId: undefined,
            },
        };

        // Calculate the time to start the job
        const msToStart = startDate.getTime() - now.getTime();

        newCronJob.metadata.startTimeoutId = setTimeout(() => {
            if (isOfTypeOnce) {
                // For 'once' jobs, execute immediately via delegator
                delegator.delegateScheduledJob(jobId);
                logger.info(`Executed once job: ${payload.name} immediately at scheduled time`);
                this.delete(jobId);
            } else {
                // NOTE: If we only start the cron task here, the current minute has already passed,
                // so node-cron would schedule the first run for the *next* matching interval
                // (e.g. tomorrow), skipping the intended first execution.
                delegator.delegateScheduledJob(jobId);

                cronTask!.start();

                logger.info(
                    `Started cron-job: ${payload.name} with expression: ${cronExpression} (type: ${payload.type})`
                );
            }
        }, msToStart);

        logger.info(
            isOfTypeOnce
                ? `Scheduled a job of type "once" to execute at ${startDate.toISOString()}: ${payload.name}`
                : `Scheduled cron-job to start at ${startDate.toISOString()}: ${payload.name} with expression: ${cronExpression}`
        );

        // Calculate the time to stop the cron job (skip for 'once' jobs)
        if (endDate && !isOfTypeOnce) {
            const msToEnd = endDate.getTime() - now.getTime();

            newCronJob.metadata.stopTimeoutId = setTimeout(() => {
                cronTask!.stop();

                logger.info(`Stopped cron-job with name: "${payload.name}" and id: "${jobId}" (end time reached)`);
            }, msToEnd);

            logger.info(
                `Scheduled cron-job to stop at ${endDate.toISOString()}: ${payload.name} with expression: ${cronExpression}`
            );
        }

        this.cronJobs.set(jobId, newCronJob);
    }

    /**
     * Deletes a cron job and removes it from memory. And clears any pending
     * start/stop timeouts and destroys the underlying cron task.
     *
     * @param jobId - The cron job id to delete
     */
    public delete(jobId: string): void {
        const cronJobById = this.cronJobs.get(jobId);

        if (!cronJobById) {
            // TODO: Add to Sentry
            logger.error(`Cannot find cron-job with id: "${jobId}" to delete`, {});
        } else {
            clearTimeout(cronJobById.metadata.startTimeoutId);
            clearTimeout(cronJobById.metadata.stopTimeoutId);

            if (cronJobById.cronTask) {
                cronJobById.cronTask.destroy();
            }

            this.cronJobs.delete(jobId);
            logger.info(`Deleted cron-job with id "${jobId}"`);
        }
    }

    /**
     * Stops a running cron job but keeps it in memory for potential reactivation.
     * Clears any pending start/stop timeouts and stops task execution.
     * The job can be restarted later by calling schedule() again.
     *
     * @param jobId - The cron job id to stop
     */
    public stop(jobId: string): void {
        const cronJobById = this.cronJobs.get(jobId);

        if (!cronJobById) {
            logger.error(`Cannot find cron-job with id: "${jobId}" to stop`, {});
        } else {
            clearTimeout(cronJobById.metadata.stopTimeoutId);
            clearTimeout(cronJobById.metadata.startTimeoutId);

            cronJobById.metadata.stopTimeoutId = undefined;
            cronJobById.metadata.startTimeoutId = undefined;

            if (cronJobById.cronTask) {
                cronJobById.cronTask.stop();
            }

            logger.info(`Stopped cron-job with id: "${jobId}"`);
        }
    }

    /**
     * Returns a read-only array of all scheduled cron jobs currently in memory.
     * Each entry contains the job ID, task and metadata.
     * The returned array is frozen to prevent unintended mutations at runtime.
     *
     * @returns An array of cron job objects with their id and metadata.
     */
    get allJobs(): ReadonlyArray<CronJob & { id: string }> {
        return Array.from(this.cronJobs.entries()).map(([id, job]) => ({
            id,
            ...job,
        }));
    }
}
