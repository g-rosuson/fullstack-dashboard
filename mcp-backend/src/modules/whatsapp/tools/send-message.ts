import { findChat } from "../helpers";

import type { SendMessageInput } from "../types";

/**
 * Returns a sent receipt. Does not append the message to the chat.
 */
async function sendMessage({ chat, text }: SendMessageInput) {
    if (!findChat(chat)) {
        return {
            isError: true as const,
            content: [{ type: "text" as const, text: `Chat not found: ${chat}` }],
        };
    }

    return {
        content: [{ type: "text" as const, text: JSON.stringify({ chat, text, status: "sent" }) }],
    };
}

export { sendMessage };
