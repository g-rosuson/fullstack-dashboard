import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { scraperToolSchema, scraperToolTargetNameSchema, scraperToolTargetSchema } from '../schemas-tools-scraper';

extendZodWithOpenApi(z);

// TODO: fix comments

/** Summary of the scraper tool target. */
const executionScraperToolTargetSummarySchema = z
    .object({
        total: z.number(),
        passed: z.number(),
        rejected: z.number(),
        reasonCounts: z.record(z.string(), z.number()),
    })
    .openapi('ExecutionScraperToolTargetSummary');

/** Structured error embedded in a failed scraped item (`ok: false`). */
const executionScraperToolTargetListingErrorSchema = z
    .object({
        code: z.string(),
        message: z.string(),
    })
    .openapi('ExecutionScraperToolTargetListingError');

/** Failed scrape of one listing with a stable key and URL context (`ok: false`). */
const executionScraperToolTargetListingFailSchema = z
    .object({
        ok: z.literal(false),
        source: scraperToolTargetNameSchema,
        url: z.string().nullable(),
        error: executionScraperToolTargetListingErrorSchema,
    })
    .openapi('ExecutionScraperToolTargetListingFail');

/** Successful scrape of one listing (`ok: true`). */
const executionScraperToolTargetListingSuccessSchema = z
    .object({
        ok: z.literal(true),
        source: scraperToolTargetNameSchema,
        url: z.string(),
        title: z.string(),
        text: z.string(),
        fields: z.record(z.string(), z.string()).optional(),
        postedAt: z.string().nullable().optional(),
    })
    .openapi('ExecutionScraperToolTargetListingSuccess');

/**
 * Single listing snapshot from a scraper portal (`ok` discriminates success vs structured failure).
 *
 * Uses `z.union` (not `discriminatedUnion('ok')`) because `zod-to-openapi` cannot emit a boolean
 * discriminator and throws “Discriminator ok could not be found…”.
 */
const executionScraperToolTargetListingSchema = z
    .union([executionScraperToolTargetListingSuccessSchema, executionScraperToolTargetListingFailSchema])
    .openapi('ExecutionScraperToolTargetListing');

/** Optional deterministic filter stage. */
const executionScraperToolTargetScreenSchema = z
    .object({
        passed: z.boolean(),
        reasonCodes: z.array(z.string()),
    })
    .openapi('ExecutionScraperToolTargetScreen');

/** Optional match / evaluation stage for the enclosing job listing row. */
const executionScraperToolTargetMatchSchema = z
    .object({
        verdict: z.string().optional(),
        confidence: z.number().optional(),
        rationale: z.string().optional(),
        schemaVersion: z.string().optional(),
    })
    .openapi('ExecutionScraperToolTargetMatch');

/**
 * One persisted pipeline row: scraped item (`listing`) plus optional downstream stages on the row.
 */
const executionScraperToolTargetResultSchema = z
    .object({
        listing: executionScraperToolTargetListingSchema,
        screen: executionScraperToolTargetScreenSchema.optional(),
        match: executionScraperToolTargetMatchSchema.optional(),
    })
    .openapi('ExecutionScraperToolTargetResult');

/**
 * An execution scraper tool target schema.
 * @note Uses spread syntax on `.shape` instead of `.extend()` to avoid `allOf` in the
 * generated OpenAPI spec, which would cause Orval to emit an unwanted `*AllOf` companion type.
 */
const executionScraperToolTargetSchema = z
    .object({
        ...scraperToolTargetSchema.shape,
        results: z.array(executionScraperToolTargetResultSchema),
        summary: executionScraperToolTargetSummarySchema,
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
    executionScraperToolSchema,
    executionScraperToolTargetSchema,
    executionScraperToolTargetResultSchema,
    executionScraperToolTargetListingSchema,
    executionScraperToolTargetSummarySchema,
    executionScraperToolTargetScreenSchema,
};
