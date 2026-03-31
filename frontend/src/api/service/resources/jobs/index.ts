import type { StreamOptions, StreamSubscription } from '../../client/types';
import type { JobStreamEvents } from './types';

import client from '../../client';
import config from './config';
import { CreateJobInput, DeleteJobResult, Job, UpdateJobInput } from '@/_types/_gen';
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
    return await client.post<ApiResponse<Job>, UpdateJobInput>(path, payload);
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
const getAll = async () => {
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
    create,
    getById,
    getAll,
    update,
    streamAll,
    deleteById,
};

export default resources;
export type { JobStreamEvents };
