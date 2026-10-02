import { describe, expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";

import whatsappModule from "./";
import { chats } from "./chats";
import { CHAT_URI_TEMPLATE, TOOL_LIST_CHATS, TOOL_SEND_MESSAGE } from "./constants";

describe("whatsapp module", () => {
    test("FR-MCP-TLS-005 declares all four tool behavior hints", () => {
        const server = new McpServer({ name: "test", version: "0.0.0" });

        whatsappModule.register(server);

        const registered = server as unknown as {
            _registeredTools: Record<string, { annotations?: Record<string, boolean> }>;
        };

        expect(registered._registeredTools[TOOL_LIST_CHATS]?.annotations).toEqual({
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        });
        expect(registered._registeredTools[TOOL_SEND_MESSAGE]?.annotations).toEqual({
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        });
    });

    test("FR-WHATSAPP-RES-001 registers each listed chat", () => {
        const server = new McpServer({ name: "test", version: "0.0.0" });

        whatsappModule.register(server);

        const registered = server as unknown as {
            _registeredResources: Record<string, { name: string; metadata?: { description?: string } }>;
        };

        for (const chat of chats) {
            expect(registered._registeredResources[chat.uri]).toMatchObject({
                name: chat.id,
                metadata: { description: chat.description },
            });
        }
    });

    test("FR-WHATSAPP-RES-004 registers the chat template without listing it again", () => {
        const server = new McpServer({ name: "test", version: "0.0.0" });

        whatsappModule.register(server);

        const registered = server as unknown as {
            _registeredResourceTemplates: Record<string, { resourceTemplate: { listCallback?: unknown; uriTemplate: { toString(): string } } }>;
        };
        const template = registered._registeredResourceTemplates.chat;

        expect(template?.resourceTemplate.uriTemplate.toString()).toBe(CHAT_URI_TEMPLATE);
        expect(template?.resourceTemplate.listCallback).toBeUndefined();
    });
});
