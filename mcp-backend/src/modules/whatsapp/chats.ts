import type { Chat } from "./types";

/**
 * Fixed chats. Reads return these messages. Sending a message does not append one.
 */
const chats: readonly Chat[] = [
    {
        id: "family",
        title: "Family",
        uri: "whatsapp://chats/family",
        description: "The family chat",
        messages: [
            { from: "Alex", text: "Dinner at 7?", at: "2026-10-01T17:04:00Z" },
            { from: "Sam", text: "I'll be there.", at: "2026-10-01T17:06:00Z" },
        ],
    },
    {
        id: "work",
        title: "Work",
        uri: "whatsapp://chats/work",
        description: "The work chat",
        messages: [{ from: "Jordan", text: "The build is green.", at: "2026-10-01T09:12:00Z" }],
    },
];

export { chats };
