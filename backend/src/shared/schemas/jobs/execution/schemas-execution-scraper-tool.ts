import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { scraperTargetResultSchema, scraperToolSchema, scraperToolTargetSchema } from '../tools/schemas-tools-scraper';

extendZodWithOpenApi(z);

/**
 * An execution scraper tool target schema.
 * @note Uses spread syntax on `.shape` instead of `.extend()` to avoid `allOf` in the
 * generated OpenAPI spec, which would cause Orval to emit an unwanted `*AllOf` companion type.
 */
const executionScraperToolTargetSchema = z
    .object({
        ...scraperToolTargetSchema.shape,
        results: z.array(scraperTargetResultSchema),
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

export { executionScraperToolTargetSchema, executionScraperToolSchema };
