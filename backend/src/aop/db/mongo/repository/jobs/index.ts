import { ClientSession, Db, ObjectId } from 'mongodb';

import { ResourceNotFoundException, SchemaValidationException } from 'aop/exceptions';
import { DatabaseOperationFailedException } from 'aop/exceptions/errors/database';
import { parseSchema } from 'lib/validation';

import config from '../../config';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { CreateJobPayload, UpdateJobPayload } from './types';
import type { JobDocument } from 'shared/types/jobs';
import type { ExecutionPayload } from 'shared/types/jobs/tools/execution/types-execution';

import { deleteJobResultSchema, jobDocumentSchema, jobSchema } from 'shared/schemas/jobs';

/**
 * JobRepository encapsulates persistence logic for job execution records.
 */
class JobRepository {
    private readonly db: Db;
    private readonly collectionName: string;

    constructor(db: Db) {
        this.db = db;
        this.collectionName = config.db.collection.jobs.name;
    }

    /**
     * Persists a new job execution record.
     *
     * Note: No schema validation is performed here because insertOne does not return
     * the document — the response is built from the already-validated in-memory
     * payload. Document integrity is verified on read via {@link getById}.
     *
     * @param payload Job data to store
     * @param session Optional Mongo session for transactional contexts
     * @returns The created job document
     */
    async create(payload: CreateJobPayload, session?: ClientSession) {
        const { userId, ...rest } = payload;

        const insertResult = await this.db.collection<JobDocument>(this.collectionName).insertOne(
            {
                _id: new ObjectId(),
                ...rest,
                userId: new ObjectId(userId),
            },
            { session }
        );

        if (!insertResult.acknowledged) {
            throw new DatabaseOperationFailedException(ErrorMessage.DATABASE_OPERATION_FAILED_ERROR);
        }

        const createdJob = {
            id: insertResult.insertedId.toString(),
            ...payload,
        };

        const schemaResult = parseSchema(jobSchema, createdJob);

        if (!schemaResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: schemaResult.issues });
        }

        return schemaResult.data;
    }

    /**
     * Updates an existing cron job document by ID.
     *
     * @param payload The update payload including id and userId for ownership verification
     * @param session Optional Mongo session for transactional contexts
     * @throws ResourceNotFoundException if cron job not found or user doesn't own it
     * @throws SchemaValidationException if schema validation fails
     * @returns Promise resolving to MongoDB's UpdateResult
     */
    async update(payload: UpdateJobPayload, session?: ClientSession) {
        const { id, userId, name, schedule, tools, updatedAt } = payload;

        const updateResult = await this.db.collection<JobDocument>(this.collectionName).findOneAndUpdate(
            { _id: new ObjectId(id), userId: new ObjectId(userId) },
            { $set: { name, schedule, tools, updatedAt } },
            {
                returnDocument: 'after',
                ...(session ? { session } : {}),
            }
        );

        if (!updateResult) {
            throw new ResourceNotFoundException(ErrorMessage.JOBS_NOT_FOUND_IN_DATABASE);
        }

        const { _id, ...rest } = updateResult;

        const updatedJob = {
            id: _id.toString(),
            ...rest,
        };

        const schemaResult = parseSchema(jobSchema, updatedJob);

        if (!schemaResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: schemaResult.issues });
        }

        return schemaResult.data;
    }

    /**
     * Adds an execution to a job document.
     * @param payload Execution data to add
     * @param session Optional Mongo session for transactional contexts
     * @throws ResourceNotFoundException if resource is not found
     * @throws SchemaValidationException if schema validation fails
     * @returns The updated job document
     */
    async addExecution(payload: ExecutionPayload, session?: ClientSession) {
        const { jobId, ...executions } = payload;

        const executionResult = await this.db.collection<JobDocument>(this.collectionName).findOneAndUpdate(
            { _id: new ObjectId(jobId) },
            { $push: { executions } },
            {
                returnDocument: 'after',
                ...(session ? { session } : {}),
            }
        );

        if (!executionResult) {
            throw new ResourceNotFoundException(ErrorMessage.JOBS_FAILED_TO_ADD_EXECUTION);
        }

        const schemaResult = parseSchema(jobDocumentSchema, executionResult);

        if (!schemaResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: schemaResult.issues });
        }

        return schemaResult.data;
    }

    /**
     * Deletes a job document by ID.
     *
     * @param id The job ID to delete
     * @param userId The user ID for ownership verification
     * @param session Optional Mongo session for transactional contexts
     * @returns Promise resolving to MongoDB's DeleteResult
     * @throws ResourceNotFoundException if job not found or user doesn't own it
     */
    async delete(id: string, userId: string, session?: ClientSession) {
        const deleteResult = await this.db
            .collection<JobDocument>(this.collectionName)
            .deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, { ...(session ? { session } : {}) });

        if (deleteResult.deletedCount === 0) {
            throw new ResourceNotFoundException(ErrorMessage.JOBS_NOT_FOUND_IN_DATABASE);
        }

        const deletedJobResult = {
            id,
        };

        const schemaResult = parseSchema(deleteJobResultSchema, deletedJobResult);

        if (!schemaResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: schemaResult.issues });
        }

        return schemaResult.data;
    }

    /**
     * Retrieves a job document by ID.
     *
     * @param id The job ID to search for
     * @param userId The user ID for ownership verification
     * @returns Promise resolving to the job document if found
     * @throws ResourceNotFoundException if job not found or user doesn't own it
     */
    async getById(id: string, userId: string) {
        const jobDocument = await this.db
            .collection<JobDocument>(this.collectionName)
            .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });

        if (!jobDocument) {
            throw new ResourceNotFoundException(ErrorMessage.JOBS_NOT_FOUND_IN_DATABASE);
        }

        // Normalize the job document
        const { _id, ...rest } = jobDocument;

        const job = {
            id: _id.toString(),
            ...rest,
        };

        const schemaResult = parseSchema(jobSchema, job);

        if (!schemaResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: schemaResult.issues });
        }

        return schemaResult.data;
    }

    /**
     * Retrieves all jobs for a user with pagination.
     *
     * @param userId The user ID to filter jobs by
     * @param limit Maximum number of jobs to return
     * @param offset Number of jobs to skip
     * @returns Promise resolving to array of job documents
     */
    async getAllByUserId(userId: string, limit: number, offset: number) {
        const jobDocuments = await this.db
            .collection<JobDocument>(this.collectionName)
            .find({ userId: new ObjectId(userId) })
            .skip(offset)
            .limit(limit)
            .toArray();

        const mappedJobs = [];

        for (const jobDocument of jobDocuments) {
            const { _id, ...rest } = jobDocument;

            const job = {
                id: _id.toString(),
                ...rest,
            };

            const result = parseSchema(jobSchema, job);

            if (!result.success) {
                throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: result.issues });
            }

            mappedJobs.push(result.data);
        }

        return mappedJobs;
    }

    /**
     * Retrieves all jobs for system operations (e.g., server initialization, rescheduling).
     * This method is NOT user-scoped and should only be used for system-level operations.
     *
     * @param limit Maximum number of jobs to return (0 for unlimited)
     * @param offset Number of jobs to skip
     * @returns Promise resolving to array of job documents
     */
    async getAll(limit: number, offset: number) {
        const query = this.db.collection<JobDocument>(this.collectionName).find().skip(offset);

        const jobDocuments = limit > 0 ? await query.limit(limit).toArray() : await query.toArray();

        const mappedJobs = [];

        for (const jobDocument of jobDocuments) {
            const { _id, ...rest } = jobDocument;

            const job = {
                id: _id.toString(),
                ...rest,
            };

            const result = parseSchema(jobSchema, job);

            if (!result.success) {
                throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: result.issues });
            }

            mappedJobs.push(result.data);
        }

        return mappedJobs;
    }
}

export { JobRepository };
