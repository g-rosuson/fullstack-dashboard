import { z } from 'zod';

import { jobScheduleSchema } from 'shared/schemas/jobs';

/**
 * A job schedule type.
 */
type JobSchedule = z.infer<typeof jobScheduleSchema>;

export type { JobSchedule };
