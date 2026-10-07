/**
 * Protocol version the MCP server accepts on the first modern request.
 * Matches HTTP-MCP-PRT-001 and the exposure suite.
 */
const MCP_PROTOCOL_VERSION = '2026-07-28';

const MCP_CLIENT_INFO = {
    name: 'backend',
    version: '0.0.0',
} as const;

const MCP_METHODS = {
    listTools: 'tools/list',
    listResources: 'resources/list',
    listResourceTemplates: 'resources/templates/list',
    callTool: 'tools/call',
    readResource: 'resources/read',
} as const;

const MCP_HEADERS = {
    contentType: 'Content-Type',
    accept: 'Accept',
    protocolVersion: 'MCP-Protocol-Version',
    method: 'Mcp-Method',
    name: 'Mcp-Name',
} as const;

const MCP_META_KEYS = {
    protocolVersion: 'io.modelcontextprotocol/protocolVersion',
    clientInfo: 'io.modelcontextprotocol/clientInfo',
    clientCapabilities: 'io.modelcontextprotocol/clientCapabilities',
} as const;

export { MCP_PROTOCOL_VERSION, MCP_CLIENT_INFO, MCP_METHODS, MCP_HEADERS, MCP_META_KEYS };
