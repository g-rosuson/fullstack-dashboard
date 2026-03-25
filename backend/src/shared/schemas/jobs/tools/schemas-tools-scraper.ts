import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * A scraper tool target name schema.
 */
const scraperToolTargetNameSchema = z.enum(['jobs-ch']).openapi('ScraperToolTargetName');

/**
 * A scraper tool type schema.
 */
const scraperToolTypeSchema = z.literal('scraper').openapi('ScraperToolType');

/**
 * A scraper tool target schema.
 */
const scraperToolTargetSchema = z
    .object({
        target: scraperToolTargetNameSchema,
        targetId: z.string(),
        keywords: z.array(z.string()).min(1).optional(),
        maxPages: z.number().positive().optional(),
    })
    .openapi('ScraperToolTarget');

/**
 * A scraper tool schema.
 */
const scraperToolSchema = z
    .object({
        type: scraperToolTypeSchema,
        targets: z.array(scraperToolTargetSchema),
        keywords: z.array(z.string()).min(1),
        maxPages: z.number().positive(),
    })
    .openapi('ScraperTool');

export { scraperToolTargetNameSchema, scraperToolTypeSchema, scraperToolSchema, scraperToolTargetSchema };
