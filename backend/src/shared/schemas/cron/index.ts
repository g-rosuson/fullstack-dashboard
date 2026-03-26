import { z } from 'zod';

/**
 * A cron job type schema.
 */
const cronJobTypeSchema = z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']);

export { cronJobTypeSchema };
