import type { EchoInput } from "../types";

/**
 * Returns the caller's message. No I/O.
 */
async function echo({ message }: EchoInput) {
    return {
        content: [{ type: "text" as const, text: `You said: ${message}` }],
    };
}

export { echo };
