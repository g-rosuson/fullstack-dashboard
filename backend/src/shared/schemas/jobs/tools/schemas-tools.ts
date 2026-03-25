import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
    emailToolSchema,
    emailToolTargetNameSchema,
    emailToolTargetSchema,
    emailToolTypeSchema,
} from './schemas-tools-email';
import {
    scraperToolSchema,
    scraperToolTargetNameSchema,
    scraperToolTargetSchema,
    scraperToolTypeSchema,
} from './schemas-tools-scraper';

extendZodWithOpenApi(z);

/**
 * A tool schema.
 */
const toolSchema = z.discriminatedUnion('type', [scraperToolSchema, emailToolSchema]).openapi('Tool');

/**
 * A tool target name schema.
 */
const toolTargetNameSchema = z
    .union([scraperToolTargetNameSchema, emailToolTargetNameSchema])
    .openapi('ToolTargetName');

/**
 * A tool target schema.
 */
const toolTargetSchema = z.union([scraperToolTargetSchema, emailToolTargetSchema]).openapi('ToolTarget');

/**
 * A tool type schema.
 */
const toolTypeSchema = z.union([scraperToolTypeSchema, emailToolTypeSchema]).openapi('ToolType');

export { toolSchema, toolTargetNameSchema, toolTypeSchema, toolTargetSchema };
