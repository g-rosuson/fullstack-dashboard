import { ResourceNotFoundError } from "@modelcontextprotocol/server";

import { findChatByUri } from "../helpers";

/**
 * Returns the fixed messages for a listed chat. No I/O.
 */
function readChat(uri: URL) {
    const chat = findChatByUri(uri.href);

    if (!chat) {
        throw new ResourceNotFoundError(uri.href);
    }

    return {
        contents: [
            {
                uri: chat.uri,
                mimeType: "application/json" as const,
                text: JSON.stringify({
                    id: chat.id,
                    title: chat.title,
                    messages: chat.messages,
                }),
            },
        ],
    };
}

export { readChat };
