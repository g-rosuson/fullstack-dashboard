# HTTP — MCP prompt stream

`GET /api/mcp/stream`

Auth: [HTTP-AUTH-TOK-003](../auth/session.md).

The browser connects here. Starting a prompt is [HTTP-MCP-PRG-007](#http-mcp-prg-007--start-prompt). Events for that prompt then arrive on this stream.

Prompt events are for the user who started the prompt ([FR-MCP-OWN-001](../../../requirements/fr/mcp/ownership.md)). Each event is sent when that step happens ([FR-MCP-PRG-001](../../../requirements/fr/mcp/progress.md)).

Every event includes `type` and `promptId`.

- `selecting` — the model asks for the list of tools and resources. See [arguments](./arguments.md)
- `permission` — `domain`, `name`, `kind` (`"tool"` or `"resource"`). See [selection](./selection.md)
- `call` — `status` (`"processing"`, `"succeeded"`, `"failed"`, or `"refused"`), `domain`, `name`, `kind`. Arguments and result: [record](./record.md). `refused`: [selection](./selection.md)
- `answering` — the answer is being written from tool and resource results
- `answer` — `content`, `startedAt`, `finishedAt` (ISO-8601, separate fields), `domains`, `list`, `messages`. See [record](./record.md)
- `error` — [failure](./failure.md)
- `stopped` — [stop](./stop.md)

## HTTP-MCP-PRG-001 — Open stream

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - No body
- Response:
  - Status: `200`
  - Headers: `Content-Type` includes `text/event-stream`; `Cache-Control: no-cache, no-transform`; `Connection: keep-alive`; `X-Accel-Buffering: no`
  - Body: SSE stream (not a JSON envelope)

Traces:

- [FR-MCP-PRG-001](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-PRG-002 — Selecting

The model asks for the list of tools and resources ([HTTP-MCP-ARG-002](./arguments.md)). From that list it selects the tools and resources relevant to the prompt. Permission for each one follows ([HTTP-MCP-SEL-001](./selection.md)). The model fills arguments after the user allows one ([HTTP-MCP-ARG-001](./arguments.md)).

- Event: `type` `"selecting"`

Traces:

- [FR-MCP-PRG-002](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-004](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-PRG-003 — Asking for permission

When the system asks the user for permission:

- Event: `type` `"permission"`
- Sent before the matching `call` with `status` `"processing"` or `"refused"`. Rules: [HTTP-MCP-SEL-001](./selection.md)

Traces:

- [FR-MCP-PRG-003](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-PRG-004 — Tool or resource status

For each tool or resource the prompt uses, as it changes:

- Event: `type` `"call"`
- `status`: `"processing"`, then `"succeeded"` or `"failed"`, when the tool or resource runs
- `status` `"refused"` is [HTTP-MCP-SEL-005](./selection.md). It is sent in place of `"processing"`
- `domain`, `name`, and `kind` match that tool or resource
- A `"processing"` event is sent before `"succeeded"` or `"failed"` for the same `domain`, `name`, and `kind`
- The event is sent before `answer`

Traces:

- [FR-MCP-PRG-004](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-PRG-005 — Writing the answer

When the answer is being written from tool and resource results:

- Event: `type` `"answering"`
- Sent after `call` events for tools and resources that ran, and before `answer`
- May follow `selecting` directly when no tool or resource ran

Traces:

- [FR-MCP-PRG-005](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-PRG-006 — Finished answer

When the answer is finished and the prompt did not stop or hit a model-provider or server failure:

- Event: `type` `"answer"`
- `content`: string
- `startedAt` and `finishedAt`: ISO-8601, separate fields
- `startedAt` is when the prompt started

Traces:

- [FR-MCP-PRG-006](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-PRG-007 — Start prompt

`POST /api/mcp/prompt`

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Body: `conversationId` (string); `prompt` (string); `turnIds` (omit or empty: [HTTP-MCP-CTX-002](./context.md); otherwise [HTTP-MCP-CTX-001](./context.md))
  - `conversationId` is from [HTTP-MCP-CNV-001](./conversation.md), and belongs to this user ([HTTP-MCP-OWN-002](./ownership.md))
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { promptId: string }, meta: { timestamp: string } }`
  - The prompt is being answered after this response
  - Later prompt events for it use `promptId` equal to `data.promptId`

Traces:

- [FR-MCP-PRG-001](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-CTX-001](../../../requirements/fr/mcp/context.md)
- [FR-MCP-CTX-002](../../../requirements/fr/mcp/context.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)

## HTTP-MCP-PRG-008 — Second prompt while one is active

The conversation already has a prompt being answered. That includes a prompt waiting on permission.

- Request: [HTTP-MCP-PRG-007](#http-mcp-prg-007--start-prompt) with that `conversationId`
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`
- The first prompt is unchanged

Traces:

- [FR-MCP-CNV-004](../../../requirements/fr/mcp/conversation.md)

## HTTP-MCP-PRG-009 — Stream closes while a prompt is active

- The client closes `GET /api/mcp/stream` while a prompt in that user’s conversation is being answered
- That prompt keeps running until it finishes, is stopped, or fails
- Events that were not sent before the close are not kept for a later stream
- A later `GET /api/mcp/stream`, while a `permission` ask for that prompt is still open, sends that `permission` event again, with the same `promptId`, `domain`, `name`, and `kind`
- A finished answer is still a turn on the next conversation read ([HTTP-MCP-CNV-004](./conversation.md))

Traces:

- [FR-MCP-CNV-005](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-SEL-006](../../../requirements/fr/mcp/selection.md)
