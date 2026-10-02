# HTTP — Echo a message

`POST /mcp`

## HTTP-ECHO-MSG-001 — Echo returns the submitted text

- Request:
  - Modern MCP request
  - `Mcp-Method: tools/call`
  - `Mcp-Name: echo`
  - Method: `tools/call`
  - `params.name` = `echo`
  - `params.arguments` = `{ "message": "hello" }`
- Response:
  - Status: `200`
  - `result.content[0]` = `{ type: "text", text: "You said: hello" }`
  - `result.isError` is not `true`

Traces:

- [FR-ECHO-MSG-001](../../../requirements/fr/echo/echo.md)
- [FR-MCP-TLS-002](../../../requirements/fr/mcp/tools.md)
