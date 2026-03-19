import { z } from 'zod';

import { loginUserPayloadSchema, registerUserPayloadSchema } from '../schemas';

/**
 * A login user payload schema.
 */
type LoginUserPayload = z.infer<typeof loginUserPayloadSchema>;

/**
 * A register user payload schema.
 */
type RegisterUserPayload = z.infer<typeof registerUserPayloadSchema>;

/**
 * A create user payload schema.
 */
type CreateUserPayload = Omit<RegisterUserPayload, 'confirmationPassword'>;

export type { LoginUserPayload, RegisterUserPayload, CreateUserPayload };
