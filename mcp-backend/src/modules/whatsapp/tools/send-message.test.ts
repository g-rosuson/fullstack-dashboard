import { describe, expect, test } from "bun:test";

import { chats } from "../chats";
import { findChat } from "../helpers";
import { readChat } from "../resources/read-chat";
import { sendMessage } from "./send-message";

describe("sendMessage", () => {
    test("FR-WHATSAPP-MSG-001 returns a receipt and leaves the chat unchanged", async () => {
        const family = chats[0];
        if (!family) {
            throw new Error("expected a family chat");
        }

        const before = readChat(new URL(family.uri));
        const result = await sendMessage({ chat: family.id, text: "On my way" });
        const after = readChat(new URL(family.uri));

        expect(result.content[0]?.text).toBe(JSON.stringify({ chat: family.id, text: "On my way", status: "sent" }));
        expect(after).toEqual(before);
        expect(findChat(family.id)?.messages).toEqual(family.messages);
    });

    test("FR-WHATSAPP-MSG-002 refuses a chat that is not listed", async () => {
        const result = await sendMessage({ chat: "missing", text: "Hello" });

        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toBe("Chat not found: missing");
    });
});
