# HTTP — MCP exposure

`POST http://mcp-server:3000/mcp`

The Express server calls that address. The MCP server is on the private network and publishes no public port. Only the Express server can open the connection. The public API does not serve `POST /mcp`.

A valid request is [HTTP-MCP-PRT-001](../../../../../mcp-backend/docs/specs/architecture/http/mcp/protocol.md).

## HTTP-MCP-EXP-001 — Application call

- Request:
  - Sent from the Express server
  - `POST http://mcp-server:3000/mcp`
  - Valid MCP request
- Response:
  - Status: `200`
  - One JSON body, as in HTTP-MCP-PRT-001

Traces:

- [FR-MCP-EXP-001](../../../requirements/fr/mcp/exposure.md)
- [FR-MCP-EXP-003](../../../requirements/fr/mcp/exposure.md)

## HTTP-MCP-EXP-002 — Public internet

- Request:
  - Sent from the public internet to the MCP server
- Response:
  - The connection does not complete
  - No HTTP status

Traces:

- [FR-MCP-EXP-002](../../../requirements/fr/mcp/exposure.md)
- [FR-MCP-EXP-003](../../../requirements/fr/mcp/exposure.md)
- [NFR-SEC-MCP-002](../../../requirements/nfr/security/mcp.md)

## HTTP-MCP-EXP-003 — Public application hosts

- Request:
  - `POST /mcp` to the public dashboard host
  - `POST /mcp` to the public API host
- Response:
  - Neither response is an MCP JSON-RPC result

Traces:

- [FR-MCP-EXP-002](../../../requirements/fr/mcp/exposure.md)
- [FR-MCP-EXP-003](../../../requirements/fr/mcp/exposure.md)
- [NFR-SEC-MCP-002](../../../requirements/nfr/security/mcp.md)
