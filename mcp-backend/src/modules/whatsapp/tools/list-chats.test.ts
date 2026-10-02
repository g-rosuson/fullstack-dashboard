import { describe, expect, test } from "bun:test";

import { chats } from "../chats";
import { listChats } from "./list-chats";

describe("listChats", () => {
    test("FR-WHATSAPP-CHT-001 returns each listed chat and its URI", async () => {
        const result = await listChats({});

        expect(JSON.parse(result.content[0]?.text ?? "")).toEqual({
            chats: chats.map(({ id, title, uri, description }) => ({ id, title, uri, description })),
        });
    });
});
