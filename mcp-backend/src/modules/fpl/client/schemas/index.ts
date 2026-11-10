/**
 * PingOne token response. `refresh_token` is absent when the server does not rotate.
 */

import { z } from "zod";

const tokenSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_in: z.number().optional(),
});

export { tokenSchema };
