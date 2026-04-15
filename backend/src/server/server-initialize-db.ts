import { MongoClientManager } from 'aop/db/mongo/client';
import { DbContext } from 'aop/db/mongo/context';
import { Delegator } from 'aop/delegator';
import { logger } from 'aop/logging';
import { Scheduler } from 'aop/scheduler';

import config from 'config';

import { retryWithFixedInterval } from 'utils';

/**
 * Initializes database and schedules active cron jobs.
 *
 * Performs database initialization with retry logic for transient connection failures.
 * Retry behavior is configurable via environment variables:
 * - MAX_DB_RETRIES: Maximum number of retry attempts (default: 3)
 * - DB_RETRY_DELAY_MS: Fixed delay between retries in milliseconds (default: 5000)
 *
 * @throws Error if database initialization fails after all retry attempts
 */
export const initializeDatabase = async () => {
    logger.info('Initializing database connection');

    const mongoManager = MongoClientManager.getInstance({
        uri: config.mongoURI,
        dbName: config.mongoDBName,
    });

    // Connect to MongoDB with retry logic (includes ping + indexing)
    const db = await retryWithFixedInterval(() => mongoManager.connect(), {
        maxAttempts: config.maxDbRetries!,
        delayMs: config.dbRetryDelayMs!,
        operationName: 'database initialization',
    });

    logger.info('Database connection established successfully');

    /**
     * Check if all cron jobs are scheduled in case the server crashed.
     */
    logger.info('Checking if all jobs are scheduled or delegated');

    // Create a new database context
    const transaction = {
        startSession: () => mongoManager.startSession(),
    };

    const dbContext = new DbContext(db, transaction);

    // Get all persisted jobs for rescheduling
    const persistedJobs = await dbContext.repository.jobs.getAll(0, 0);

    if (persistedJobs.length) {
        // Initialize scheduler instance
        const schedulerInstance = Scheduler.getInstance();

        // Initialize delegator instance
        const delegatorInstance = Delegator.getInstance();

        // TODO: Jobs that have a startDate in the past and are not outdated run immediately.
        // TODO: Since the scheduler uses the startDate and current time to calculate the next run, which results in a negative number,
        // TODO: triggering the timeout callback immediately.
        // TODO: Looks like we need to calculate a nextRunDate when an execution finishes and persist it in the document.
        // TODO: We want to run the job immediately if the startDate is in the past and an execution for that run does not exist, other wise note right?
        for (const job of persistedJobs) {
            const isOutdated = job.schedule && job.schedule.endDate && new Date(job.schedule.endDate) < new Date();

            if (job.schedule && !isOutdated) {
                schedulerInstance.schedule({
                    jobId: job.id,
                    name: job.name,
                    type: job.schedule.type,
                    startDate: job.schedule.startDate,
                    endDate: job.schedule.endDate,
                });

                delegatorInstance.register({
                    userId: job.userId,
                    jobId: job.id,
                    name: job.name,
                    tools: job.tools,
                    scheduleType: job.schedule.type,
                });
            }
        }
    }

    logger.info('Database initialization completed successfully');
};
