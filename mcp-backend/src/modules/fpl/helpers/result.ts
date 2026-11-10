import { UPSTREAM_UNUSABLE } from "../constants/messages";

import type { ToolResult } from "../types";

/**
 * Successful tool payload. `text` is JSON.
 */
function toolJson(value: unknown): ToolResult {
    return {
        content: [{ type: "text", text: JSON.stringify(value) }],
    };
}

/**
 * Tool error on a completed response. No JSON-RPC `error` member.
 */
function toolError(message: string): ToolResult {
    return {
        content: [{ type: "text", text: message }],
        isError: true,
    };
}

/**
 * Maps a thrown failure to a tool error. Callers handle a not-found error first when the id belongs in the message.
 */
function toolFailure(error: unknown): ToolResult {
    if (error instanceof Error) {
        return toolError(error.message);
    }

    return toolError(UPSTREAM_UNUSABLE);
}

export { toolError, toolFailure, toolJson };
