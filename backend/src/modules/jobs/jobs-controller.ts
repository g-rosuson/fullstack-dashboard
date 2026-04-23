import { Request, Response } from 'express';

import { BusinessLogicException } from 'aop/exceptions';
import { sendSSE } from 'aop/http/sse';
import { logger } from 'aop/logging';

import mappers from './mappers';
import constants from 'shared/constants';

import { CreateJobInput, EnrichedJob, EnrichedJobSchedule, IdRouteParam, UpdateJobInput } from './types';
import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { EventTypeToPayloadMap } from 'shared/types/jobs/events/types-jobs-events';

/**
 * Creates a new job in the database and if defined, schedules it to run at a later time.
 *
 * @param req Express request object with typed body
 * @param res Express response object
 */
const createJob = async (req: Request<unknown, unknown, CreateJobInput>, res: Response) => {
    /**
     * Start a new session for the transaction so we can rollback the
     * transaction if the cron job fails to schedule.
     */
    const session = req.context.db.transaction.startSession();

    // Track if the transaction has been committed
    let isCommitted = false;

    try {
        // Start a new transaction
        session.startTransaction();

        // Create the job document
        const createJobPayload = {
            userId: req.context.user.id,
            name: req.body.name,
            tools: req.body.tools.map(tool => mappers.mapToIds(tool)),
            schedule: req.body.schedule,
            createdAt: new Date().toISOString(),
            updatedAt: null,
        };

        const createdJob = await req.context.db.repository.jobs.create(createJobPayload, session);

        // Commit the transaction
        await session.commitTransaction();
        isCommitted = true;

        // Enrich the job with the next and previous run dates for its schedule
        let schedule: EnrichedJobSchedule | null = null;

        if (createdJob.schedule) {
            req.context.scheduler.schedule({
                jobId: createdJob.id,
                name: createdJob.name,
                type: createdJob.schedule.type,
                startDate: createdJob.schedule.startDate,
                endDate: createdJob.schedule.endDate,
            });

            const { nextRun, previousRun } = req.context.scheduler.getNextAndPreviousRun(createdJob.id);

            schedule = {
                ...createdJob.schedule,
                nextRun: nextRun ? nextRun.toISOString() : null,
                lastRun: previousRun ? previousRun.toISOString() : null,
            };
        }

        // Respond with the created job
        res.status(HttpStatusCode.CREATED).json({
            success: true,
            data: {
                ...createdJob,
                schedule,
            },
        });

        if (createdJob.schedule) {
            req.context.delegator.register({
                jobId: createdJob.id,
                userId: req.context.user.id,
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: createdJob.schedule.type,
            });
        } else {
            req.context.delegator.delegate({
                jobId: createdJob.id,
                userId: req.context.user.id,
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: null,
            });
        }
    } catch (error) {
        if (!isCommitted) {
            await session.abortTransaction();
        }

        logger.error('Failed to create job', { error: error as Error });

        // Re-throw the error to be handled by the error middleware
        throw error;
    } finally {
        await session.endSession();
    }
};

/**
 * Updates an existing job by ID.
 *
 * @param req Express request object with typed params and body
 * @param res Express response object
 */
const updateJob = async (req: Request<IdRouteParam, unknown, UpdateJobInput>, res: Response) => {
    /**
     * Start a new session for the transaction so we can rollback the
     * transaction if the cron job fails to schedule
     */
    const session = req.context.db.transaction.startSession();
    let isCommitted = false;

    try {
        // Start a new transaction
        session.startTransaction();

        // Don't allow updating a job if its tools are running
        if (req.context.delegator.runningJobs.has(req.params.id)) {
            throw new BusinessLogicException(ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING);
        }

        // Determine job document
        const updateJobPayload = {
            id: req.params.id,
            userId: req.context.user.id,
            name: req.body.name,
            schedule: req.body.schedule,
            tools: req.body.tools.map(tool => mappers.mapToIds(tool)),
            updatedAt: new Date().toISOString(),
        };

        // Update the job in the database
        const updatedJob = await req.context.db.repository.jobs.update(updateJobPayload, session);

        // Commit the transaction
        await session.commitTransaction();
        isCommitted = true;

        // Enrich the job with the next and previous run dates for its schedule
        let schedule: EnrichedJobSchedule | null = null;

        // Schedule a cron job if the job has a schedule
        if (updateJobPayload.schedule) {
            // Note: .schedule() destroys an existing cron job before scheduling a new one
            req.context.scheduler.schedule({
                name: updateJobPayload.name,
                type: updateJobPayload.schedule.type,
                startDate: updateJobPayload.schedule.startDate,
                endDate: updateJobPayload.schedule.endDate,
                jobId: updateJobPayload.id,
            });

            const { nextRun, previousRun } = req.context.scheduler.getNextAndPreviousRun(updateJobPayload.id);

            schedule = {
                ...updateJobPayload.schedule,
                nextRun: nextRun ? nextRun.toISOString() : null,
                lastRun: previousRun ? previousRun.toISOString() : null,
            };
        }

        // Respond with the updated job
        res.status(HttpStatusCode.OK).json({
            success: true,
            data: {
                ...updatedJob,
                schedule,
            },
        });

        if (updateJobPayload.schedule) {
            // Note: .register() replaces an existing task with the new one
            req.context.delegator.register({
                jobId: updateJobPayload.id,
                userId: req.context.user.id,
                name: updateJobPayload.name,
                tools: updateJobPayload.tools,
                scheduleType: updateJobPayload.schedule.type,
            });
        } else if (updateJobPayload.schedule === null) {
            // If the schedule is null, delete the job from the scheduler
            req.context.scheduler.delete(updateJobPayload.id);

            if (req.body.runJob) {
                // If the job should run again and there's no schedule, delegate it immediately
                req.context.delegator.delegate({
                    jobId: updateJobPayload.id,
                    userId: req.context.user.id,
                    name: updateJobPayload.name,
                    tools: updateJobPayload.tools,
                    scheduleType: null,
                });
            }
        }
    } catch (error) {
        if (!isCommitted) {
            // Abort the transaction if there's an error before commit
            await session.abortTransaction();
        }

        logger.error('Failed to update cron job', { error: error as Error });

        // Re-throw the error to be handled by the error middleware
        throw error;
    } finally {
        await session.endSession();
    }
};

/**
 * Deletes a job by ID.
 *
 * @param req Express request object with typed params
 * @param res Express response object
 */
const deleteJob = async (req: Request<IdRouteParam>, res: Response) => {
    const { id } = req.params;
    const userId = req.context.user.id;

    // Delete the job from the database
    const result = await req.context.db.repository.jobs.delete(id, userId);

    // Respond with the id of the deleted job
    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { id: result.id },
    });
};

/**
 * Retrieves a single job by ID.
 *
 * @param req Express request object with typed params
 * @param res Express response object
 */
const getJob = async (req: Request<IdRouteParam>, res: Response) => {
    const { id } = req.params;
    const userId = req.context.user.id;

    const job = await req.context.db.repository.jobs.getById(id, userId);

    let schedule: EnrichedJobSchedule | null = null;
    if (job.schedule) {
        const { nextRun, previousRun } = req.context.scheduler.getNextAndPreviousRun(id);
        schedule = {
            ...job.schedule,
            nextRun: nextRun ? nextRun.toISOString() : null,
            lastRun: previousRun ? previousRun.toISOString() : null,
        };
    }

    const enrichedJob: EnrichedJob = { ...job, schedule };

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: enrichedJob,
    });
};

/**
 * Retrieves all jobs with pagination.
 *
 * @param req Express request object with query params
 * @param res Express response object
 */
const getAllJobs = async (req: Request, res: Response) => {
    const userId = req.context.user.id;

    // Parse query params with defaults
    // Limit refers to the number of jobs to return
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;

    // Offset refers to the number of jobs to skip (e.g. if offset is 10, we skip the first 10 jobs)
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const jobs = await req.context.db.repository.jobs.getAllByUserId(userId, limit, offset);

    const enrichedJobs: EnrichedJob[] = jobs.map(job => {
        if (job.schedule) {
            const { nextRun, previousRun } = req.context.scheduler.getNextAndPreviousRun(job.id);
            return {
                ...job,
                schedule: {
                    ...job.schedule,
                    nextRun: nextRun ? nextRun.toISOString() : null,
                    lastRun: previousRun ? previousRun.toISOString() : null,
                },
            };
        }

        return {
            ...job,
            schedule: null,
        };
    });

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: enrichedJobs,
        limit,
        offset,
        count: enrichedJobs.length,
    });
};

/**
 * Retrieves a stream of job events.
 *
 * @param req Express request object
 * @param res Express response object
 * @todo Validate schemas and generate front-end types for emitted events
 */
const streamJobs = (req: Request, res: Response) => {
    // Set the response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    /**
     * Stream the ID's of running jobs per user, so
     * the client can reflect the job state.
     */
    const runningJobs = req.context.delegator.runningJobs;
    const runningJobIds: string[] = [];

    for (const [jobId, job] of runningJobs.entries()) {
        if (job.userId === req.context.user.id) {
            runningJobIds.push(jobId);
        }
    }

    sendSSE(res, { runningJobs: runningJobIds, type: constants.events.jobs.runningJobs });

    /**
     * Stream previously emitted job target events on client re-connect.
     *
     * We intentionally replay events individually instead of batching them so
     * they match the format of live events, preserve ordering, and are leaner.
     */
    for (const event of req.context.emitter.allEmittedJobTargetEvents) {
        if (event.userId === req.context.user.id && req.context.delegator.runningJobs.has(event.jobId)) {
            sendSSE(res, event);
        }
    }

    // TODO: (node:15993) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 running-jobs listeners added to [EventEmitter]. Use emitter.setMaxListeners() to increase limit
    /**
     * Listen for events and stream corresponding payloads to the client for the current user.
     */
    const onRunningJobs = (event: EventTypeToPayloadMap[typeof constants.events.jobs.runningJobs]) => {
        if (event.userId === req.context.user.id) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.jobs.runningJobs, onRunningJobs);

    const onTargetFinished = (event: EventTypeToPayloadMap[typeof constants.events.jobs.targetFinished]) => {
        if (event.userId === req.context.user.id) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.jobs.targetFinished, onTargetFinished);

    const onJobFinished = (event: EventTypeToPayloadMap[typeof constants.events.jobs.jobFinished]) => {
        if (event.userId === req.context.user.id) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.jobs.jobFinished, onJobFinished);

    const onJobFailed = (event: EventTypeToPayloadMap[typeof constants.events.jobs.jobFailed]) => {
        if (event.userId === req.context.user.id) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.jobs.jobFailed, onJobFailed);

    /**
     * Remove listeners when the connection is closed.
     */
    req.on('close', () => {
        req.context.emitter.off(constants.events.jobs.runningJobs, onRunningJobs);
        req.context.emitter.off(constants.events.jobs.targetFinished, onTargetFinished);
        req.context.emitter.off(constants.events.jobs.jobFinished, onJobFinished);
        req.context.emitter.off(constants.events.jobs.jobFailed, onJobFailed);
    });
};

export { createJob, deleteJob, getAllJobs, getJob, streamJobs, updateJob };
