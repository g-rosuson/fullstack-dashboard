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

        for (const job of persistedJobs) {
            if (!job.schedule) {
                continue;
            }

            const now = new Date();
            const isExpired = job.schedule.endDate && new Date(job.schedule.endDate) < now;

            if (isExpired) {
                continue;
            }

            const isStartDateInTheFuture = new Date(job.schedule.startDate) > now;
            if (isStartDateInTheFuture) {
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
            } else {
                // Force explicit job workflow restart for once jobs
                if (job.schedule.type === 'once') {
                    continue;
                }

                const nextRun = schedulerInstance.getNextRunFromPersistedSchedule({
                    type: job.schedule.type,
                    startDate: job.schedule.startDate,
                    endDate: job.schedule.endDate,
                });

                if (nextRun) {
                    schedulerInstance.schedule({
                        jobId: job.id,
                        name: job.name,
                        type: job.schedule.type,
                        startDate: nextRun.toISOString(),
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
    }

    logger.info('Database initialization completed successfully');
};
