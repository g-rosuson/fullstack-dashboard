import type { McpServer } from "@modelcontextprotocol/server";

/**
 * A domain plugin. HTTP and process lifecycle are not this type's concern.
 * `toolNames` must match the tools `register` actually adds.
 */
interface Module {
    readonly name: string;
    readonly toolNames: readonly string[];
    register(server: McpServer): void;
}

export type { Module };
