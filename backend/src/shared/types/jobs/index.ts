import { z } from 'zod';

import { jobDocumentSchema, jobScheduleSchema, jobSchema } from 'shared/schemas/jobs';

/**
 * A job schedule type.
 */
type JobSchedule = z.infer<typeof jobScheduleSchema>;

/**
 * A job document type.
 */
type JobDocument = z.infer<typeof jobDocumentSchema>;

/**
 * A job type.
 */
type Job = z.infer<typeof jobSchema>;

export type { JobSchedule, JobDocument, Job };
