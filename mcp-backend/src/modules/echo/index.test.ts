import { describe, expect, test } from "bun:test";
import { McpServer } from "@modelcontextprotocol/server";

import echoModule from "./";
import { TOOL_ECHO } from "./constants";

describe("echo module", () => {
    test("FR-MCP-TLS-005 declares all four tool behavior hints", () => {
        const server = new McpServer({ name: "test", version: "0.0.0" });

        echoModule.register(server);

        const registered = server as unknown as {
            _registeredTools: Record<string, { annotations?: Record<string, boolean> }>;
        };
        const annotations = registered._registeredTools[TOOL_ECHO]?.annotations;

        expect(annotations).toEqual({
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
        });
    });
});
