import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { targetErrorResultSchema } from './schemas-tools-error';

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
 * A description schema.
 */
const scraperDescriptionSchema = z
    .object({
        title: z.string().optional(),
        blocks: z.array(z.string()),
    })
    .openapi('ScraperDescription');

/**
 * An information item schema.
 */
const scraperInformationSchema = z
    .object({
        label: z.string(),
        value: z.string(),
    })
    .openapi('ScraperInformation');

/**
 * A scraper result schema.
 */
const scraperPageContentSchema = z
    .object({
        url: z.string().url(),
        title: z.string(),
        descriptions: z.array(scraperDescriptionSchema),
        informations: z.array(scraperInformationSchema),
    })
    .openapi('ScraperPageContent');

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

/**
 * A scraper target result schema.
 */
const scraperTargetResultSchema = z
    .object({
        result: scraperPageContentSchema.nullable(),
        error: targetErrorResultSchema.nullable(),
    })
    .openapi('ScraperTargetResult');

export {
    scraperToolTargetNameSchema,
    scraperToolTypeSchema,
    scraperPageContentSchema,
    scraperToolSchema,
    scraperToolTargetSchema,
    scraperTargetResultSchema,
    scraperDescriptionSchema,
    scraperInformationSchema,
};
