import { z } from 'zod';

import { cronJobTypeSchema } from 'shared/schemas/cron';

type CronJobType = z.infer<typeof cronJobTypeSchema>;

export type { CronJobType };
