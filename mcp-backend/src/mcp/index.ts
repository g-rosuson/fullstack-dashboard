import { McpServer } from "@modelcontextprotocol/server";
import { name, version } from "../../package.json" with { type: "json" };

import modules from "../modules";
import type { Module } from "../modules/types";

/**
 * Fresh MCP server with enrolled domain tools. HTTP transport is not this module's concern.
 */
function createServer(): McpServer {
    const server = new McpServer({
        name,
        version,
    });

    for (const domainModule of modules.list) {
        domainModule.register(server);
    }

    return server;
}

/**
 * Throws when two enrolled modules share a `name`, or two tools share a name.
 * MCP looks up tools by name only. Call once at boot, not per request.
 */
function validateModules(modulesToValidate?: readonly Module[]): void {
    const names = new Set<string>();
    const toolNames = new Set<string>();

    for (const domainModule of modulesToValidate || modules.list) {
        if (names.has(domainModule.name)) {
            throw new Error(`Duplicate module name: ${domainModule.name}`);
        }

        names.add(domainModule.name);

        for (const toolName of domainModule.toolNames) {
            if (toolNames.has(toolName)) {
                throw new Error(`Duplicate tool name: ${toolName}`);
            }

            toolNames.add(toolName);
        }
    }
}

const mcp = {
    createServer,
    validateModules,
};

export default mcp;
