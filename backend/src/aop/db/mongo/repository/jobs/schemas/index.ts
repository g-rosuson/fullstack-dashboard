import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { cronJobTypeSchema, scraperToolTargetNameSchema } from 'shared/schemas/jobs';

extendZodWithOpenApi(z);

/**
 * An execution payload schema.
 * @private
 */
const executionSchema = z.object({
    schedule: z.object({
        type: cronJobTypeSchema.nullable(),
        delegatedAt: z.coerce.date(),
        finishedAt: z.coerce.date().nullable(),
    }),
    tools: z
        .array(
            z.object({
                type: z.literal('scraper'),
                targets: z.array(
                    z.object({
                        target: scraperToolTargetNameSchema,
                        targetId: z.string(),
                        keywords: z.array(z.string()).optional(),
                        maxPages: z.number().positive().optional(),
                        results: z
                            .array(
                                z.object({
                                    result: z
                                        .object({
                                            url: z.string().url(),
                                            title: z.string(),
                                            description: z.array(
                                                z.object({
                                                    title: z.string().optional(),
                                                    blocks: z.array(z.string()),
                                                })
                                            ),
                                            information: z.array(
                                                z.object({
                                                    label: z.string(),
                                                    value: z.string(),
                                                })
                                            ),
                                        })
                                        .nullable(),
                                    error: z
                                        .object({
                                            message: z.string(),
                                        })
                                        .nullable(),
                                })
                            )
                            .nullable(),
                    })
                ),
                keywords: z.array(z.string()),
                maxPages: z.number().positive(),
            })
        )
        .min(1),
});

/**
 * A job document schema.
 */
const jobDocumentSchema = z
    .object({
        _id: z.instanceof(ObjectId),
        userId: z.instanceof(ObjectId),
        name: z.string(),
        tools: z
            .array(
                z.object({
                    type: z.literal('scraper'),
                    targets: z.array(
                        z.object({
                            target: scraperToolTargetNameSchema,
                            targetId: z.string(),
                            keywords: z.array(z.string()).optional(),
                            maxPages: z.number().positive().optional(),
                        })
                    ),
                    keywords: z.array(z.string()).min(1),
                    maxPages: z.number().positive(),
                })
            )
            .min(1),
        schedule: z
            .object({
                type: cronJobTypeSchema,
                startDate: z.coerce.date(),
                endDate: z.coerce.date().nullable(),
            })
            .nullable(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date().nullable(),
        executions: z.array(executionSchema).optional(),
    })
    .openapi('JobDocument');

export { jobDocumentSchema };
