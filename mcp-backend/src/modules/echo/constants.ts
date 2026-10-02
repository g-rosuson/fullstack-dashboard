/**
 * Module id in the catalog. Distinct from {@link TOOL_ECHO}; those namespaces do not collide.
 */
const NAME = "echo";

/**
 * MCP tool name. Clients send this on `tools/call`.
 */
const TOOL_ECHO = "echo";

const TOOL_NAMES = [TOOL_ECHO] as const;

export { NAME, TOOL_ECHO, TOOL_NAMES };
