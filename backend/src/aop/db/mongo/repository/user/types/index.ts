import { z } from 'zod';

import { userDocumentSchema } from '../schemas';

/**
 * A create user payload schema.
 */
type CreateUserPayload = Pick<z.infer<typeof userDocumentSchema>, 'firstName' | 'lastName' | 'password' | 'email'>;

export type { CreateUserPayload };
