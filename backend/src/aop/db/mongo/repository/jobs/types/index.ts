import type { JobDocument } from 'shared/types/jobs';

/**
 * A create job payload schema.
 * @note the JobDocument defines the "userId" as an ObjectId,
 * due to this we need to define it as a string.
 */
type CreateJobPayload = Omit<JobDocument, '_id' | 'userId' | 'updatedAt' | 'executions'> & {
    userId: string;
};

/**
 * A update job payload schema.
 */
type UpdateJobPayload = Pick<CreateJobPayload, 'name' | 'schedule' | 'tools'> & {
    id: string;
    userId: string;
    updatedAt: string;
};

export type { CreateJobPayload, UpdateJobPayload };
