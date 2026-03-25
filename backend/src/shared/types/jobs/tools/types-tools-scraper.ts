import { z } from 'zod';

import {
    scraperDescriptionSchema,
    scraperInformationSchema,
    scraperPageContentSchema,
    scraperTargetResultSchema,
    scraperToolSchema,
    scraperToolTargetSchema,
} from 'shared/schemas/jobs/tools/schemas-tools-scraper';

/**
 * A scraper description.
 */
type ScraperDescription = z.infer<typeof scraperDescriptionSchema>;

/**
 * A scraper information.
 */
type ScraperInformation = z.infer<typeof scraperInformationSchema>;

/**
 * A scraper target result.
 */
type ScraperTargetResult = z.infer<typeof scraperTargetResultSchema>;

/**
 * A scraper page content.
 */
type ScraperPageContent = z.infer<typeof scraperPageContentSchema>;

/**
 * A scraper tool target.
 */
type ScraperToolTarget = z.infer<typeof scraperToolTargetSchema>;

/**
 * A scraper tool.
 */
type ScraperTool = z.infer<typeof scraperToolSchema>;

export type {
    ScraperDescription,
    ScraperInformation,
    ScraperTargetResult,
    ScraperPageContent,
    ScraperTool,
    ScraperToolTarget,
};
