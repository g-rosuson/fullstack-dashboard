# HTTP — Unhandled application error

Any route whose handler throws outside the MCP handler. A failure inside the MCP handler stays JSON-RPC `-32603` (`Internal server error`).

## HTTP-ERR-INT-001 — Generic internal error

- Response:
  - Status: `500`
  - Body: `{ error: "internal" }`

Traces:

- [NFR-SEC-BND-009](../../../requirements/nfr/security/boundary.md)
