import { z } from 'zod';

import { createJobInputSchema, idRouteParamSchema, updateJobInputSchema } from '../schemas';

/**
 * A create job input schema.
 */
type CreateJobInput = z.infer<typeof createJobInputSchema>;

/**
 * A update job input schema.
 */
type UpdateJobInput = z.infer<typeof updateJobInputSchema>;

/**
 * A id route param schema.
 */
type IdRouteParam = z.infer<typeof idRouteParamSchema>;

export type { CreateJobInput, IdRouteParam, UpdateJobInput };
