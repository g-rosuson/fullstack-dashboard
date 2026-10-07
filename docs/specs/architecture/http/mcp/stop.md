# HTTP — Stop MCP prompt

`POST /api/mcp/prompt/:id/stop`

Auth: [HTTP-AUTH-TOK-003](../auth/session.md). Another user’s prompt or an unknown id: [HTTP-MCP-OWN-001](./ownership.md).

The prompt stream is [HTTP-MCP-PRG-001](./prompt.md).

## HTTP-MCP-STP-001 — Stop while answering

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = this user’s prompt that is being answered
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { promptId: string }, meta: { timestamp: string } }`
  - `data.promptId` equals the path `id`
- Stream, after the response:
  - One event: `type` `"stopped"`
  - A tool call, resource read, or model call that was already running is cancelled
  - No later `call` with `status` `"processing"`, `"succeeded"`, or `"failed"`
  - No later `selecting`, `permission`, `answering`, or `answer` event

Traces:

- [FR-MCP-STP-001](../../../requirements/fr/mcp/stop.md)
- [FR-MCP-STP-002](../../../requirements/fr/mcp/stop.md)
- [FR-MCP-STP-004](../../../requirements/fr/mcp/stop.md)
- [FR-MCP-STP-005](../../../requirements/fr/mcp/stop.md)

## HTTP-MCP-STP-002 — Reject when not answering

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = this user’s prompt that is not being answered
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`

Traces:

- [FR-MCP-STP-003](../../../requirements/fr/mcp/stop.md)
