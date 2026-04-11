import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * A email tool target name schema.
 * @note the target name is the email address.
 */
const emailToolTargetNameSchema = z.string().openapi('EmailToolTargetName');

/**
 * A email tool type schema.
 */
const emailToolTypeSchema = z.literal('email').openapi('EmailToolType');

/**
 * A email tool target schema.
 */
const emailToolTargetSchema = z
    .object({
        target: emailToolTargetNameSchema,
        targetId: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
    })
    .openapi('EmailToolTarget');

/**
 * A email tool schema.
 */
const emailToolSchema = z
    .object({
        toolId: z.string(),
        type: emailToolTypeSchema,
        targets: z.array(emailToolTargetSchema),
        subject: z.string().optional(),
        body: z.string().optional(),
    })
    .openapi('EmailTool');

export { emailToolTargetNameSchema, emailToolTypeSchema, emailToolSchema, emailToolTargetSchema };
