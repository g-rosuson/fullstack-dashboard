# Events

Prompt progress is an emitter event. The stream writes it when that step happens ([FR-MCP-PRG-001](../../specs/requirements/fr/mcp/progress.md)). Scenarios: [prompt.md](../../specs/architecture/http/mcp/prompt.md).

Conversation create, list, read, and delete stay request/response JSON. They are not emitter events.

## Registration

Each prompt event is registered in three places:

- `mcp` in `backend/src/shared/constants/events/index.ts` — the wire `type` strings
- `McpEventTypeToPayloadMap` in `backend/src/shared/types/mcp/events/`
- `eventSchemas` in `backend/src/aop/emitter/schemas/index.ts`

The emitter intersects the jobs map and `McpEventTypeToPayloadMap`. `sendSSE` serializes that same object. The `type` strings do not overlap with jobs (`selecting` versus `job-finished`), so each key has one payload.

## Types

- `selecting` — the model asks for the list ([HTTP-MCP-PRG-002](../../specs/architecture/http/mcp/prompt.md))
- `permission` — `domain`, `name`, `kind` (`"tool"` or `"resource"`), `arguments` ([HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md))
- `call` — `status` (`"processing"`, `"succeeded"`, `"failed"`, or `"refused"`), `domain`, `name`, `kind`, `arguments`. `result` is present only when `status` is `succeeded` ([HTTP-MCP-REC-001](../../specs/architecture/http/mcp/record.md), [HTTP-MCP-REC-002](../../specs/architecture/http/mcp/record.md))
- `answering` — the answer is being written ([HTTP-MCP-PRG-005](../../specs/architecture/http/mcp/prompt.md))
- `answer` — `content`, `startedAt`, `finishedAt`, `domains`, `list`, `messages` ([HTTP-MCP-PRG-006](../../specs/architecture/http/mcp/prompt.md), [HTTP-MCP-REC-003](../../specs/architecture/http/mcp/record.md))
- `error` — `context`, `messages`, and `list` when the model asked for it ([HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md))
- `stopped` — `messages`, and `list` when the model asked for it ([HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md))

Every event also carries `type`, `promptId`, and `userId`. `userId` is the access token’s `id` claim. It stays on the payload. The listener still writes only when `event.userId` is the authenticated user, so another user’s id is not sent on this connection ([FR-MCP-OWN-001](../../specs/requirements/fr/mcp/ownership.md)).

## Shapes the answer carries

`domains` is `{ name, tools: { name }[], resources: { name }[] }[]`. A refusal is absent from `domains`.

`list.tools` carry `argumentFields` (`name`, `type`, `required`). `list.resources` carry `uri`, or `uriTemplate` when the URI depends on the prompt ([HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md)).

A tool `result` is `{ content, isError? }`. A resource `result` is `{ contents }`.

Full value shapes live in the Zod schemas under `backend/src/shared/schemas/mcp/events/` and in OpenAPI.
