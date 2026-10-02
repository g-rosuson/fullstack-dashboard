import { z } from "zod";

const inputSchema = z.object({
    message: z.string(),
});

export { inputSchema };
