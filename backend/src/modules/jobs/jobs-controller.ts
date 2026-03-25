import { Request, Response } from 'express';

import { BusinessLogicException } from 'aop/exceptions';
import { sendSSE } from 'aop/http/sse';
import { logger } from 'aop/logging';

import mappers from './mappers';
import constants from 'shared/constants';

import { CreateJobInput, IdRouteParam, UpdateJobInput } from './types';
import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

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

        // Schedule the job if it has a schedule
        if (createdJob.schedule) {
            req.context.scheduler.schedule({
                jobId: createdJob.id,
                name: createdJob.name,
                type: createdJob.schedule.type,
                startDate: createdJob.schedule.startDate,
                endDate: createdJob.schedule.endDate,
            });

            // Register the task with the delegator
            req.context.delegator.register({
                jobId: createdJob.id,
                userId: req.context.user.id,
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: createdJob.schedule.type,
            });
        } else {
            // Delegate the job immediately when it has no schedule
            req.context.delegator.delegate({
                jobId: createdJob.id,
                userId: req.context.user.id,
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: null,
            });
        }

        // Commit the transaction
        await session.commitTransaction();

        // Respond with the created job
        res.status(HttpStatusCode.CREATED).json({
            success: true,
            data: createdJob,
        });
    } catch (error) {
        // Abort the transaction if there's an error
        await session.abortTransaction();

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

        // Schedule a cron job if the job has a schedule
        if (req.body.runJob && updateJobPayload.schedule) {
            // Note: .schedule() destroys an existing cron job before scheduling a new one
            req.context.scheduler.schedule({
                name: updateJobPayload.name,
                type: updateJobPayload.schedule.type,
                startDate: updateJobPayload.schedule.startDate,
                endDate: updateJobPayload.schedule.endDate,
                jobId: updateJobPayload.id,
            });

            // Note: .register() replaces an existing task with the new one
            req.context.delegator.register({
                jobId: updateJobPayload.id,
                userId: req.context.user.id,
                name: updateJobPayload.name,
                tools: updateJobPayload.tools,
                scheduleType: updateJobPayload.schedule.type,
            });
        } else if (req.body.runJob) {
            // Delegate the job immediately when it has no schedule
            req.context.delegator.delegate({
                jobId: updateJobPayload.id,
                userId: req.context.user.id,
                name: updateJobPayload.name,
                tools: updateJobPayload.tools,
                scheduleType: null,
            });
        }

        // Commit the transaction
        await session.commitTransaction();

        // Respond with the updated job
        res.status(HttpStatusCode.OK).json({
            success: true,
            data: updatedJob,
        });
    } catch (error) {
        // Abort the transaction if there's an error
        await session.abortTransaction();

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

    // Respond with the deleted job
    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { ...result, id },
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

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: job,
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

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: jobs,
        limit,
        offset,
        count: jobs.length,
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

    /**
     * Listen for events and stream corresponding payloads to the client.
     */
    req.context.emitter.on(constants.events.jobs.targetFinished, event => {
        sendSSE(res, event);
    });

    req.context.emitter.on(constants.events.jobs.jobFinished, event => {
        sendSSE(res, event);
    });

    /**
     * Remove listeners when the connection is closed.
     */
    req.on('close', () => {
        req.context.emitter.off(constants.events.jobs.targetFinished, event => {
            sendSSE(res, event);
        });

        req.context.emitter.off(constants.events.jobs.jobFinished, event => {
            sendSSE(res, event);
        });
    });
};

export { createJob, deleteJob, getAllJobs, getJob, streamJobs, updateJob };
