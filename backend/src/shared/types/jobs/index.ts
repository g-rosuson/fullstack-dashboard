import { z } from 'zod';

import { jobDocumentSchema, jobScheduleSchema } from 'shared/schemas/jobs';

/**
 * A job schedule type.
 */
type JobSchedule = z.infer<typeof jobScheduleSchema>;

/**
 * A job document type.
 */
type JobDocument = z.infer<typeof jobDocumentSchema>;

export type { JobSchedule, JobDocument };
