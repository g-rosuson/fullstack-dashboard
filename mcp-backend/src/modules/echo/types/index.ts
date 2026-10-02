import type { z } from "zod";
import type { inputSchema } from "../schemas";

type EchoInput = z.infer<typeof inputSchema>;

export type { EchoInput };
