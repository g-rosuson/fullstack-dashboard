import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { scraperToolSchema, scraperToolTargetNameSchema, scraperToolTargetSchema } from '../schemas-tools-scraper';

extendZodWithOpenApi(z);

/** Structured error embedded in a failed scraped item (`ok: false`). */
const executionScrapedItemErrorSchema = z
    .object({
        code: z.string(),
        message: z.string(),
    })
    .openapi('ExecutionScrapedItemError');

/** Successful scrape of one listing (`ok: true`). */
const executionScrapedItemSuccessSchema = z
    .object({
        ok: z.literal(true),
        listingKey: z.string(),
        source: scraperToolTargetNameSchema,
        url: z.string(),
        title: z.string(),
        text: z.string(),
        fields: z.record(z.string(), z.string()).optional(),
        postedAt: z.string().nullable().optional(),
    })
    .openapi('ExecutionScrapedItemSuccess');

/** Failed scrape of one listing with a stable key and URL context (`ok: false`). */
const executionScrapedItemFailSchema = z
    .object({
        ok: z.literal(false),
        listingKey: z.string(),
        source: scraperToolTargetNameSchema,
        url: z.string(),
        error: executionScrapedItemErrorSchema,
    })
    .openapi('ExecutionScrapedItemFail');

/**
 * Single listing snapshot from a scraper portal (`ok` discriminates success vs structured failure).
 *
 * Uses `z.union` (not `discriminatedUnion('ok')`) because `zod-to-openapi` cannot emit a boolean
 * discriminator and throws “Discriminator ok could not be found…”.
 */
const executionScrapedItemSchema = z
    .union([executionScrapedItemSuccessSchema, executionScrapedItemFailSchema])
    .openapi('ExecutionScrapedItem');

/** Optional deterministic stage after scrape (cheap checks). */
const executionScrapedItemPrefilterSchema = z
    .object({
        passed: z.boolean(),
        reasonCodes: z.array(z.string()),
    })
    .openapi('ExecutionScrapedItemPrefilter');

/** Optional match / evaluation stage for the enclosing job listing row. */
const executionJobItemMatchSchema = z
    .object({
        verdict: z.string().optional(),
        confidence: z.number().optional(),
        rationale: z.string().optional(),
        schemaVersion: z.string().optional(),
    })
    .openapi('ExecutionJobItemMatch');

/**
 * One persisted pipeline row: scraped item (`listing`) plus optional downstream stages on the row.
 */
const executionJobItemRowSchema = z
    .object({
        listing: executionScrapedItemSchema,
        prefilter: executionScrapedItemPrefilterSchema.optional(),
        match: executionJobItemMatchSchema.optional(),
    })
    .openapi('ExecutionJobItemRow');

/**
 * An execution scraper tool target schema.
 * @note Uses spread syntax on `.shape` instead of `.extend()` to avoid `allOf` in the
 * generated OpenAPI spec, which would cause Orval to emit an unwanted `*AllOf` companion type.
 */
const executionScraperToolTargetSchema = z
    .object({
        ...scraperToolTargetSchema.shape,
        results: z.array(executionJobItemRowSchema),
    })
    .openapi('ExecutionScraperToolTarget');

/**
 * An execution scraper tool schema.
 * @note Uses spread syntax on `.shape` instead of `.extend()` to avoid `allOf` in the
 * generated OpenAPI spec, which would cause Orval to emit an unwanted `*AllOf` companion type.
 */
const executionScraperToolSchema = z
    .object({
        ...scraperToolSchema.shape,
        targets: z.array(executionScraperToolTargetSchema),
    })
    .openapi('ExecutionScraperTool');

export {
    executionScraperToolTargetSchema,
    executionScraperToolSchema,
    executionJobItemRowSchema,
    executionScrapedItemSchema,
};
