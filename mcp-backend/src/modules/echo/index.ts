import { NAME, TOOL_ECHO, TOOL_NAMES } from "./constants";
import { inputSchema } from "./schemas";
import { echo } from "./tools/echo";

import type { McpServer } from "@modelcontextprotocol/server";
import type { Module } from "../types";

function register(server: McpServer): void {
    server.registerTool(
        TOOL_ECHO,
        {
            description: "Echos back a provided message.",
            inputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        echo,
    );
}

const echoModule: Module = {
    name: NAME,
    toolNames: TOOL_NAMES,
    register,
};

export default echoModule;
