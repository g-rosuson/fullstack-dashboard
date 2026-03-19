import { z } from 'zod';

/**
 * A scraper tool target name schema.
 */
const scraperToolTargetNameSchema = z.enum(['jobs-ch']);

export { scraperToolTargetNameSchema };
