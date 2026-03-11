import cron from 'node-cron';

import { Delegator } from 'aop/delegator';
import { InternalException } from 'aop/exceptions';
import { logger } from 'aop/logging';

import { CronJob, FormatCronExpressionPayload, NextAndPreviousRunPayload, SchedulePayload } from './types';

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
                logger.error(`Cannot find cron-job with id: "${jobId}"`, {});
                return { nextRun, previousRun };
            }

            if (!cronJob.cronExpression) {
                return { nextRun, previousRun };
            }

            // Create cron-parser iterators for next and previous runs.
            // - nextInterval: starts at either now or the job's startDate (whichever is later), stops at endDate if defined.
            // - prevInterval: starts at now and looks back to the job's startDate to find the last occurrence.
            const nextInterval = parser.parse(cronJob.cronExpression, {
                currentDate: now < cronJob.startDate ? cronJob.startDate : now,
                endDate: cronJob.endDate ?? undefined,
            });

            const prevInterval = parser.parse(cronJob.cronExpression, {
                currentDate: now,
                startDate: cronJob.startDate,
            });

            // Calling next() or prev() can throw if there is no next/previous occurrence within the defined start/end range,
            // or if the cron expression is invalid. Nested try-catch allows us to log and recover from errors in each computation
            // separately while still returning whatever value we can (nextRun or previousRun) instead of nulling both.
            try {
                nextRun = nextInterval.next().toDate();
            } catch (error) {
                logger.error(`Error computing next run for job "${jobId}":`, { error: error as Error });
            }

            try {
                previousRun = prevInterval.prev().toDate();
            } catch (error) {
                logger.error(`Error computing previous run for job "${jobId}":`, { error: error as Error });
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
    private delete(jobId: string): void {
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
