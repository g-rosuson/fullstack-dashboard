import { z } from 'zod';

import { scraperToolSchema, scraperToolTargetSchema } from 'shared/schemas/jobs/tools/schemas-tools-scraper';

/**
 * A scraper tool target.
 */
type ScraperToolTarget = z.infer<typeof scraperToolTargetSchema>;

/**
 * A scraper tool.
 */
type ScraperTool = z.infer<typeof scraperToolSchema>;

export type { ScraperTool, ScraperToolTarget };
