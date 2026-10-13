import type { StreamOptions, StreamSubscription } from '../../client/types';
import type { JobStreamEvents } from './types';

import client from '../../client';
import config from './config';
import {
    ChangeJobScheduleStatusPayload,
    CreateJobInput,
    DeleteJobResult,
    Job,
    RunJobResult,
    UpdateJobInput,
} from '@/_types/_gen';
import { ApiResponse } from '@/_types/infrastructure';

/**
 * Creates a job.
 */
const create = async (payload: CreateJobInput) => {
    return await client.post<ApiResponse<Job>, CreateJobInput>(config.path.create, payload);
};

/**
 * Updates a jobs.
 */
const update = async (jobId: string, payload: UpdateJobInput) => {
    const path = config.path.update + jobId;
    return await client.put<ApiResponse<Job>, UpdateJobInput>(path, payload);
};

/**
 * Stops a job.
 */
const stop = async (jobId: string) => {
    const path = config.path.stop + jobId;
    return await client.post<ApiResponse<Job>>(path);
};

/**
 * Runs a job on demand.
 */
const run = async (jobId: string): Promise<ApiResponse<RunJobResult>> => {
    const path = config.path.run + jobId;
    return await client.post<ApiResponse<RunJobResult>>(path);
};

/**
 * Changes the schedule status of a job.
 */
const changeScheduleStatus = async (
    jobId: string,
    payload: ChangeJobScheduleStatusPayload
): Promise<ApiResponse<Job>> => {
    const path = config.path.changeScheduleStatus + jobId;
    return await client.put<ApiResponse<Job>, ChangeJobScheduleStatusPayload>(path, payload);
};

/**
 * Retries the schedule of a job.
 */
const retrySchedule = async (jobId: string): Promise<ApiResponse<Job>> => {
    const path = config.path.retrySchedule + jobId;
    return await client.post<ApiResponse<Job>>(path);
};

/**
 * Retrieves a single job.
 */
const getById = async (jobId: string) => {
    const path = config.path.getById + jobId;
    return await client.get<ApiResponse<Job>>(path);
};

/**
 * Retrieves all jobs.
 */
const getAll = async (): Promise<ApiResponse<Job[]>> => {
    return await client.get<ApiResponse<Job[]>>(config.path.getAll);
};

/**
 * Deletes a job.
 */
const deleteById = async (jobId: string) => {
    const path = config.path.delete + jobId;
    return await client.del<ApiResponse<DeleteJobResult>>(path);
};

/**
 * Opens an SSE connection that streams job target events.
 */
const streamAll = (options: StreamOptions<JobStreamEvents>): StreamSubscription => {
    return client.stream<JobStreamEvents>(config.path.streamAll, options);
};

const resources = {
    changeScheduleStatus,
    retrySchedule,
    create,
    getById,
    getAll,
    update,
    run,
    stop,
    streamAll,
    deleteById,
};

export default resources;
export type { JobStreamEvents };
