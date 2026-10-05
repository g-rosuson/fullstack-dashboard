# HTTP — Host and origin

Allowlists for these scenarios:

- Bind address `127.0.0.1`
- Host allowlist `localhost`, `127.0.0.1`, `::1`
- Origin allowlist `localhost`, `127.0.0.1`

## HTTP-MCP-BND-001 — Disallowed host

`POST /mcp`

- Request:
  - Modern MCP request for `tools/list`
  - `Host: evil.example`
- Response:
  - Status: `403`
  - Body: `{ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Invalid Host: evil.example" } }`

Traces:

- [NFR-SEC-BND-001](../../../requirements/nfr/security/boundary.md)

## HTTP-MCP-BND-002 — Disallowed host on the live probe

`GET /health/live`

- Request:
  - `Host: evil.example`
- Response:
  - Same status and body as [HTTP-MCP-BND-001](#http-mcp-bnd-001--disallowed-host)

Traces:

- [NFR-SEC-BND-001](../../../requirements/nfr/security/boundary.md)

## HTTP-MCP-BND-003 — Disallowed origin

`POST /mcp`

- Request:
  - Modern MCP request for `tools/list`
  - `Host: 127.0.0.1`
  - `Origin: https://evil.example`
- Response:
  - Status: `403`
  - Body: `{ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Invalid Origin: evil.example" } }`

Traces:

- [NFR-SEC-BND-002](../../../requirements/nfr/security/boundary.md)

## HTTP-MCP-BND-004 — Origin omitted

`POST /mcp`

- Request:
  - Modern MCP request for `tools/list`
  - `Host: 127.0.0.1`
  - No `Origin` header
- Response:
  - Status: `200`

Traces:

- [NFR-SEC-BND-003](../../../requirements/nfr/security/boundary.md)

## HTTP-MCP-BND-005 — Allowed host with a port

`POST /mcp`

- Request:
  - Modern MCP request for `tools/list`
  - `Host: 127.0.0.1:3999`
- Response:
  - Status: `200`

Traces:

- [NFR-SEC-BND-004](../../../requirements/nfr/security/boundary.md)

## HTTP-MCP-BND-006 — Missing host

`POST /mcp`

- Request:
  - Modern MCP request for `tools/list`
  - No `Host` header
- Response:
  - Status: `403`
  - Body: `{ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Missing Host header" } }`

Traces:

- [NFR-SEC-BND-001](../../../requirements/nfr/security/boundary.md)
