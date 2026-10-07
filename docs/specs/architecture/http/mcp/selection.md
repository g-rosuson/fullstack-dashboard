# HTTP — MCP selection

Permission for a tool or resource the model selected. The prompt stream is [HTTP-MCP-PRG-001](./prompt.md).

The model selects one tool or resource at a time and fills its arguments ([HTTP-MCP-ARG-001](./arguments.md)). The stream sends `permission` with those arguments and waits. The ask stays open until the user allows it, refuses it, or stops the prompt. It does not expire. The stream only sends events, so the user allows with the permit request and refuses with the refuse request. One ask is open at a time. The body must be that tool or resource. After the user allows it, it runs with those arguments. A refusal skips it, and the call for that tool or resource is marked `refused`. The model then selects the next tool or resource, or writes the answer. Stopping the prompt ([HTTP-MCP-STP-001](./stop.md)) ends the ask.

- Allow — `POST /api/mcp/prompt/:id/permit`
- Refuse — `POST /api/mcp/prompt/:id/refuse`

Auth: [HTTP-AUTH-TOK-003](../auth/session.md). Another user’s prompt or an unknown id: [HTTP-MCP-OWN-001](./ownership.md).

## HTTP-MCP-SEL-001 — Selected tool or resource waits

The model selects a tool or resource.

- Stream:
  - Event: `type` `"permission"`, with that `domain`, `name`, `kind`, and `arguments`
  - A `call` with `status` `"processing"` for that tool or resource follows a successful [HTTP-MCP-SEL-003](#http-mcp-sel-003--allow-the-pending-tool-or-resource)
  - The ask stays open with no time limit ([HTTP-MCP-SEL-006](#http-mcp-sel-006--permission-stays-open))

Traces:

- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-010](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)
- [FR-MCP-PRG-003](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-SEL-002 — One ask at a time

While a `permission` event is open:

- The next `permission` event follows an allow or a refuse of that ask
- After an allow, the next `permission` event follows that call's `"succeeded"` or `"failed"`

Traces:

- [FR-MCP-SEL-002](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-SEL-003 — Allow the pending tool or resource

`POST /api/mcp/prompt/:id/permit`

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = `promptId` from the prompt stream
  - Body: `{ domain, name, kind }` equal to the pending `permission` event
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { promptId: string }, meta: { timestamp: string } }`
  - `data.promptId` equals the path `id`
- Stream: a `call` with `status` `"processing"` for that `domain`, `name`, and `kind`, carrying the `arguments` from the `permission` event

Traces:

- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)

## HTTP-MCP-SEL-004 — Permission does not match the ask

- Request:
  - `POST /api/mcp/prompt/:id/permit` or `POST /api/mcp/prompt/:id/refuse`
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` is this user’s prompt, and either no `permission` is pending or the body is not that `domain`, `name`, and `kind`
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`

Traces:

- [FR-MCP-SEL-003](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-SEL-005 — Refuse the pending tool or resource

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
  - Event: `type` `"call"`, `status` `"refused"`, with that `domain`, `name`, `kind`, and the `arguments` from the `permission` event
  - No `result`
  - That ask has no `call` with `status` `"processing"`
- The prompt continues: the model selects the next tool or resource, or writes the answer

Traces:

- [FR-MCP-SEL-005](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-007](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-PRG-008](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)

## HTTP-MCP-SEL-006 — Permission stays open

After a `permission` event, with no permit, refuse, or stop:

- The ask stays pending with no time limit
- No `error` event because time passed
- No `call` for that tool or resource because time passed

Traces:

- [FR-MCP-SEL-006](../../../requirements/fr/mcp/selection.md)
- [NFR-REL-MCP-001](../../../requirements/nfr/reliability/mcp.md)
