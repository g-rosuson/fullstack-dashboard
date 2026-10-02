import { describe, expect, test } from "bun:test";
import { ResourceNotFoundError } from "@modelcontextprotocol/server";

import { chats } from "../chats";
import { readChat } from "./read-chat";

describe("readChat", () => {
    test("FR-WHATSAPP-RES-002 returns the stored messages", () => {
        const family = chats[0];
        if (!family) {
            throw new Error("expected a family chat");
        }

        const result = readChat(new URL(family.uri));

        expect(JSON.parse(result.contents[0]?.text ?? "")).toEqual({
            id: family.id,
            title: family.title,
            messages: family.messages,
        });
    });

    test("FR-WHATSAPP-RES-003 refuses a chat that is not listed", () => {
        const uri = "whatsapp://chats/missing";

        expect(() => readChat(new URL(uri))).toThrow(ResourceNotFoundError);
    });
});
