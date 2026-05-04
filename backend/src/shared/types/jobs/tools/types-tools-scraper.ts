import { z } from 'zod';

import {
    scraperToolSchema,
    scraperToolTargetNameSchema,
    scraperToolTargetSchema,
} from 'shared/schemas/jobs/tools/schemas-tools-scraper';

/**
 * A scraper tool target.
 */
type ScraperToolTarget = z.infer<typeof scraperToolTargetSchema>;

/**
 * A scraper tool target name.
 */
type ScraperToolTargetName = z.infer<typeof scraperToolTargetNameSchema>;

/**
 * A scraper tool.
 */
type ScraperTool = z.infer<typeof scraperToolSchema>;

export type { ScraperTool, ScraperToolTarget, ScraperToolTargetName };
