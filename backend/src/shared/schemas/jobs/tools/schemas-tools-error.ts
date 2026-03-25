import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * A generic result error schema.
 */
const targetErrorResultSchema = z
    .object({
        message: z.string(),
    })
    .openapi('TargetResultError');

export { targetErrorResultSchema };
