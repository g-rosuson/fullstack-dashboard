import { z } from 'zod';

import { cronJobTypeSchema } from 'shared/schemas/cron';

/**
 * A cron job type.
 */
type CronJobType = z.infer<typeof cronJobTypeSchema> | null;

export type { CronJobType };
