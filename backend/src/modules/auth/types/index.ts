import { z } from 'zod';

import { loginUserInputSchema, registerUserInputSchema } from '../schemas';

/**
 * A login user input schema.
 */
type LoginUserInput = z.infer<typeof loginUserInputSchema>;

/**
 * A register user input schema.
 */
type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

/**
 * A create user input schema.
 */
type CreateUserPayload = Omit<RegisterUserInput, 'confirmationPassword'>;

export type { LoginUserInput, RegisterUserInput, CreateUserPayload };
