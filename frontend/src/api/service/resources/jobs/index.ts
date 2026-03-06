import {
    CreateJobPayload,
    JobDocument,
    JobDocumentExecutionsItemToolsItemTargetsItemResultsItem,
    UpdateJobPayload,
} from '_types/_gen';
import { ApiResponse } from '_types/infrastructure';

import type { StreamOptions, StreamSubscription } from '../../client/types';

import client from '../../client';
import config from './config';

type JobStreamEvents = {
    'job-target-finished': JobDocumentExecutionsItemToolsItemTargetsItemResultsItem[];
};

/**
 * Creates a job.
 */
const create = async (payload: CreateJobPayload) => {
    return await client.post<ApiResponse<JobDocument>, CreateJobPayload>(config.path.create, payload);
};

/**
 * Updates a jobs.
 */
const update = async (jobId: string, payload: UpdateJobPayload) => {
    const path = config.path.update + jobId;
    return await client.post<ApiResponse<JobDocument>, UpdateJobPayload>(path, payload);
};

/**
 * Retrieves a single job.
 */
const getById = async (jobId: string) => {
    const path = config.path.getById + jobId;
    return await client.get<ApiResponse<JobDocument>>(path);
};

/**
 * Retrieves all jobs.
 */
const getAll = async () => {
    return await client.get<ApiResponse<JobDocument[]>>(config.path.getAll);
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
};

export default resources;
export type { JobStreamEvents };
