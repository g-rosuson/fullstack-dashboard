import { ResourceTemplate } from "@modelcontextprotocol/server";

import { chats } from "./chats";
import { CHAT_URI_TEMPLATE, NAME, TOOL_LIST_CHATS, TOOL_NAMES, TOOL_SEND_MESSAGE } from "./constants";
import { readChat } from "./resources/read-chat";
import { listChatsInputSchema, sendMessageInputSchema } from "./schemas";
import { listChats } from "./tools/list-chats";
import { sendMessage } from "./tools/send-message";

import type { McpServer } from "@modelcontextprotocol/server";
import type { Module } from "../types";

function register(server: McpServer): void {
    server.registerTool(
        TOOL_LIST_CHATS,
        {
            description: "List recent WhatsApp chats",
            inputSchema: listChatsInputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        listChats,
    );

    server.registerTool(
        TOOL_SEND_MESSAGE,
        {
            description: "Send a message to a WhatsApp chat",
            inputSchema: sendMessageInputSchema,
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
                openWorldHint: false,
            },
        },
        sendMessage,
    );

    for (const chat of chats) {
        server.registerResource(
            chat.id,
            chat.uri,
            {
                description: chat.description,
                mimeType: "application/json",
            },
            async (uri) => readChat(uri),
        );
    }

    server.registerResource(
        "chat",
        new ResourceTemplate(CHAT_URI_TEMPLATE, { list: undefined }),
        {
            description: "A WhatsApp chat",
            mimeType: "application/json",
        },
        async (uri) => readChat(uri),
    );
}

const whatsappModule: Module = {
    name: NAME,
    toolNames: TOOL_NAMES,
    register,
};

export default whatsappModule;
