# HTTP — MCP protocol

`POST /mcp` unless a scenario names another method.

## HTTP-MCP-PRT-001 — First modern request

No prior request.

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/list`
  - Method: `tools/list`
- Response:
  - Status: `200`
  - `Content-Type` includes `application/json`
  - Body is one JSON object, not an event stream
  - `id` equals the request id
  - `result._meta["io.modelcontextprotocol/serverInfo"].name` = `mcp-server`
  - `result._meta["io.modelcontextprotocol/serverInfo"].version` equals `package.json` `version`

Traces:

- [FR-MCP-PRT-001](../../../requirements/fr/mcp/protocol.md)
- [FR-MCP-PRT-003](../../../requirements/fr/mcp/protocol.md)
- [FR-MCP-PRT-004](../../../requirements/fr/mcp/protocol.md)
- [FR-MCP-PRT-006](../../../requirements/fr/mcp/protocol.md)
- [FR-MCP-PRT-007](../../../requirements/fr/mcp/protocol.md)

## HTTP-MCP-PRT-002 — Legacy request rejected

- Request:
  - `Content-Type: application/json`
  - No `MCP-Protocol-Version` header
  - No `_meta` protocol envelope
  - Body: `{ jsonrpc: "2.0", id: 1, method: "tools/list" }`
- Response:
  - Status: `400`
  - Body: `{ jsonrpc: "2.0", id: 1, error: { code: -32022, message: string, data: { supported: ["2026-07-28"] } } }`

Traces:

- [FR-MCP-PRT-002](../../../requirements/fr/mcp/protocol.md)

## HTTP-MCP-PRT-003 — Session methods rejected

`GET /mcp` and `DELETE /mcp`

- Request:
  - No body
- Response, for each method:
  - Status: `405`
  - Header: `Allow: POST`
  - Body: empty

Traces:

- [FR-MCP-PRT-005](../../../requirements/fr/mcp/protocol.md)

## HTTP-MCP-PRT-005 — Invalid JSON

- Request:
  - `Content-Type: application/json`
  - Body: `{`
- Response:
  - Status: `400`
  - `Content-Type` includes `text/plain`
  - Body: `Invalid JSON`

Traces:

- [FR-MCP-PRT-008](../../../requirements/fr/mcp/protocol.md)

## HTTP-MCP-PRT-006 — Non-JSON content type

- Request:
  - `Content-Type: text/plain`
  - Body: `{}`
- Response:
  - Status: `415`
  - Body: `{ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unsupported Media Type: Content-Type must be application/json" } }`

Traces:

- [FR-MCP-PRT-009](../../../requirements/fr/mcp/protocol.md)
