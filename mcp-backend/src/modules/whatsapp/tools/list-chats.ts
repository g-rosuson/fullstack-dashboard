import { chats } from "../chats";

import type { ListChatsInput } from "../types";

/**
 * Returns the fixed chat list. No I/O.
 */
async function listChats(_input: ListChatsInput) {
    const listed = chats.map(({ id, title, uri, description }) => ({ id, title, uri, description }));

    return {
        content: [{ type: "text" as const, text: JSON.stringify({ chats: listed }) }],
    };
}

export { listChats };
