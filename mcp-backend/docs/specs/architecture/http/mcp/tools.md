# HTTP — MCP tools

`POST /mcp`

## HTTP-MCP-TLS-001 — List enrolled tools

- Request:
  - [HTTP-MCP-PRT-001](./protocol.md)
- Response:
  - Status: `200`
  - `result.tools` includes an entry with:
    - `name` = `whatsapp.list_chats`
    - `description` = `List recent WhatsApp chats`
    - `inputSchema.type` = `object`
    - `inputSchema.properties` = `{}`
    - `inputSchema.required` is absent
    - `annotations.readOnlyHint` = `true`
    - `annotations.destructiveHint` = `false`
    - `annotations.idempotentHint` = `true`
    - `annotations.openWorldHint` = `false`

Traces:

- [FR-MCP-TLS-001](../../../requirements/fr/mcp/tools.md)
- [FR-MCP-TLS-005](../../../requirements/fr/mcp/tools.md)

## HTTP-MCP-TLS-002 — Tool arguments rejected

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: whatsapp.send_message`
  - Method: `tools/call`
  - `params.name` = `whatsapp.send_message`
  - `params.arguments` = `{}`
- Response:
  - Status: `200`
  - `result.isError` = `true`
  - `result.content[0].type` = `text`
  - `result.content[0].text` contains `chat` and `expected string`
  - No `error` member

Traces:

- [FR-MCP-TLS-003](../../../requirements/fr/mcp/tools.md)

## HTTP-MCP-TLS-003 — Unknown tool

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: missing`
  - Method: `tools/call`
  - `params.name` = `missing`
  - `params.arguments` = `{}`
- Response:
  - Status: `200`
  - Body: `{ jsonrpc: "2.0", id: <request id>, error: { code: -32602, message: "Tool missing not found" } }`

Traces:

- [FR-MCP-TLS-004](../../../requirements/fr/mcp/tools.md)
