# HTTP — MCP exposure

`POST /mcp` on the MCP server. Not a route of the public API.

A valid request is [HTTP-MCP-PRT-001](../../../../../mcp-backend/docs/specs/architecture/http/mcp/protocol.md).

## HTTP-MCP-EXP-001 — Application call

- Request:
  - Sent from the application
  - Valid MCP request
- Response:
  - Status: `200`
  - One JSON body, as in HTTP-MCP-PRT-001

Traces:

- [FR-MCP-EXP-001](../../../requirements/fr/mcp/exposure.md)

## HTTP-MCP-EXP-002 — Public internet

- Request:
  - Sent from the public internet to the MCP server
- Response:
  - The connection does not complete
  - No HTTP status

Traces:

- [FR-MCP-EXP-002](../../../requirements/fr/mcp/exposure.md)
- [NFR-SEC-MCP-002](../../../requirements/nfr/security/mcp.md)

## HTTP-MCP-EXP-003 — Public application hosts

- Request:
  - `POST /mcp` to the public dashboard host
  - `POST /mcp` to the public API host
- Response:
  - Neither response is an MCP JSON-RPC result

Traces:

- [FR-MCP-EXP-002](../../../requirements/fr/mcp/exposure.md)
- [NFR-SEC-MCP-002](../../../requirements/nfr/security/mcp.md)
