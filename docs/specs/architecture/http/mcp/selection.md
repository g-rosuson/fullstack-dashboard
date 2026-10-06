# HTTP — MCP selection

Permission for a tool or resource the model picked. The prompt stream is [HTTP-MCP-PRG-001](./prompt.md).

Tools and resources the user attached on the prompt run with no ask. When the model picks one they did not attach, the stream sends `permission` and waits. The ask stays open until the user allows it, refuses it, or stops the prompt. It does not expire. The stream only sends events, so the user allows with the permit request and refuses with the refuse request. One ask is open at a time. The body must be that tool or resource. Until the user allows it, it does not run. A refusal does not run it. The call for that tool or resource is marked `refused`. Stopping the prompt ([HTTP-MCP-STP-001](./stop.md)) ends the ask.

- Allow — `POST /api/mcp/prompt/:id/permit`
- Refuse — `POST /api/mcp/prompt/:id/refuse`

Auth: [HTTP-AUTH-TOK-003](../auth/session.md). Another user’s prompt or an unknown id: [HTTP-MCP-OWN-001](./ownership.md).

## HTTP-MCP-SEL-001 — Attached tool or resource skips permission

- Request: [HTTP-MCP-PRG-007](./prompt.md) with that tool in `tools`, or that resource in `resources`
- Stream:
  - A `call` event with `status` `"processing"` for that `domain`, `name`, and `kind`
  - No `permission` event for that same `domain`, `name`, and `kind` before that `call`

Traces:

- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)

## HTTP-MCP-SEL-002 — Selected tool or resource waits

The model selects a tool or resource the user did not attach.

- Stream:
  - Event: `type` `"permission"`, with that `domain`, `name`, and `kind`
  - No `call` with `status` `"processing"` for that tool or resource until [HTTP-MCP-SEL-004](#http-mcp-sel-004--allow-the-pending-tool-or-resource) succeeds
  - The ask stays open with no time limit ([HTTP-MCP-SEL-007](#http-mcp-sel-007--permission-does-not-expire))

Traces:

- [FR-MCP-SEL-002](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-003](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)
- [FR-MCP-PRG-003](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-SEL-003 — One ask at a time

While a `permission` event has not been allowed or refused:

- The stream does not send another `permission` event

Traces:

- [FR-MCP-SEL-004](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-SEL-004 — Allow the pending tool or resource

`POST /api/mcp/prompt/:id/permit`

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = `promptId` from the prompt stream
  - Body: `{ domain, name, kind }` equal to the pending `permission` event
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { promptId: string }, meta: { timestamp: string } }`
  - `data.promptId` equals the path `id`
- Stream: a `call` with `status` `"processing"` for that `domain`, `name`, and `kind`

Traces:

- [FR-MCP-SEL-003](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)

## HTTP-MCP-SEL-005 — Permission does not match the ask

- Request:
  - `POST /api/mcp/prompt/:id/permit` or `POST /api/mcp/prompt/:id/refuse`
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` is this user’s prompt, and either no `permission` is pending or the body is not that `domain`, `name`, and `kind`
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`

Traces:

- [FR-MCP-SEL-005](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-SEL-006 — Refuse the pending tool or resource

`POST /api/mcp/prompt/:id/refuse`

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = `promptId` from the prompt stream
  - Body: `{ domain, name, kind }` equal to the pending `permission` event
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { promptId: string }, meta: { timestamp: string } }`
  - `data.promptId` equals the path `id`
- Stream:
  - Event: `type` `"call"`, `status` `"refused"`, with that `domain`, `name`, and `kind`
  - `arguments` is present
  - No `result`
  - No `call` with `status` `"processing"` for that same `domain`, `name`, and `kind`
- The prompt continues its remaining steps

Traces:

- [FR-MCP-SEL-007](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-009](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-PRG-008](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)

## HTTP-MCP-SEL-007 — Permission does not expire

After a `permission` event, with no permit, refuse, or stop:

- The ask stays pending with no time limit
- No `error` event because time passed
- No `call` for that tool or resource because time passed

Traces:

- [FR-MCP-SEL-008](../../../requirements/fr/mcp/selection.md)
- [NFR-REL-MCP-001](../../../requirements/nfr/reliability/mcp.md)
