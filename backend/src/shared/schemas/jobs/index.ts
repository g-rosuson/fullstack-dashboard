import { z } from 'zod';

/**
 * A cron job type schema.
 */
const cronJobTypeSchema = z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']);

/**
 * A scraper tool target name schema.
 */
const scraperToolTargetNameSchema = z.enum(['jobs-ch']);

export { cronJobTypeSchema, scraperToolTargetNameSchema };
