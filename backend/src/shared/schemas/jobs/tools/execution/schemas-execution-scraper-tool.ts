import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { targetErrorResultSchema } from '../schemas-tools-error';
import { scraperToolSchema, scraperToolTargetSchema } from '../schemas-tools-scraper';

extendZodWithOpenApi(z);

/**
 * A description schema.
 */
const executionScraperDescriptionSchema = z
    .object({
        title: z.string().optional(),
        blocks: z.array(z.string()),
    })
    .openapi('ExecutionScraperDescription');

/**
 * An information item schema.
 */
const executionScraperInformationSchema = z
    .object({
        label: z.string(),
        value: z.string(),
    })
    .openapi('ExecutionScraperInformation');

/**
 * A scraper result schema.
 */
const executionScraperPageContentSchema = z
    .object({
        url: z.string().url(),
        title: z.string(),
        descriptions: z.array(executionScraperDescriptionSchema),
        informations: z.array(executionScraperInformationSchema),
    })
    .openapi('ExecutionScraperPageContent');

/**
 * A scraper target result schema.
 */
const executionScraperTargetResultSchema = z
    .object({
        result: executionScraperPageContentSchema.nullable(),
        error: targetErrorResultSchema.nullable(),
    })
    .openapi('ExecutionScraperTargetResult');

/**
 * An execution scraper tool target schema.
 * @note Uses spread syntax on `.shape` instead of `.extend()` to avoid `allOf` in the
 * generated OpenAPI spec, which would cause Orval to emit an unwanted `*AllOf` companion type.
 */
const executionScraperToolTargetSchema = z
    .object({
        ...scraperToolTargetSchema.shape,
        results: z.array(executionScraperTargetResultSchema),
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
    executionScraperDescriptionSchema,
    executionScraperInformationSchema,
    executionScraperPageContentSchema,
    executionScraperTargetResultSchema,
};
