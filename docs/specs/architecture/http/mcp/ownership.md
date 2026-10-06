# HTTP — MCP ownership

Auth gate: [HTTP-AUTH-TOK-003](../auth/session.md).

A request for another user’s prompt or conversation is indistinguishable from a missing one.

## HTTP-MCP-OWN-001 — Other user’s prompt or unknown id

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = unknown prompt, or a prompt started by a different user
  - Method/path: either
    - `POST /api/mcp/prompt/:id/permit`
    - `POST /api/mcp/prompt/:id/refuse`
    - `POST /api/mcp/prompt/:id/stop`
- Response:
  - Status: `404`
  - Body: `{ success: false, code: "NOT_FOUND_ERROR", timestamp: string }`

Traces:

- [FR-MCP-OWN-001](../../../requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-002](../../../requirements/fr/mcp/ownership.md)

## HTTP-MCP-OWN-002 — Other user’s conversation or unknown id

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path or body id = unknown conversation, or a conversation owned by a different user
  - Method/path: any of
    - `GET /api/mcp/conversations/:id`
    - `DELETE /api/mcp/conversations/:id`
    - `POST /api/mcp/prompt` with that `conversationId`
- Response:
  - Status: `404`
  - Body: `{ success: false, code: "NOT_FOUND_ERROR", timestamp: string }`

Traces:

- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-004](../../../requirements/fr/mcp/ownership.md)
