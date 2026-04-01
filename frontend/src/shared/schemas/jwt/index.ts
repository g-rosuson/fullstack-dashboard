import { z } from 'zod';

const jwtPayloadSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    id: z.string(),
});

export { jwtPayloadSchema };
