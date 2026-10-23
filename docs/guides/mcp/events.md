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
- `saving` — the turn is being saved ([HTTP-MCP-PRG-005](../../specs/architecture/http/mcp/prompt.md))
- `answer` — `content`, `prompt`, `turnId`, `startedAt`, `finishedAt`, `domains`, `list`, `messages` ([HTTP-MCP-PRG-006](../../specs/architecture/http/mcp/prompt.md), [HTTP-MCP-REC-003](../../specs/architecture/http/mcp/record.md))
- `error` — `context`, `messages`, and `list` when the model asked for it ([HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md))
- `stopped` — `messages`, and `list` when the model asked for it ([HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md))
- `prompts-aggregated` — one snapshot on connect. Each prompt still in progress carries `phase` and the `selecting`, `permission`, `call`, and `saving` events already sent. `answer`, `error`, and `stopped` are not in that snapshot ([HTTP-MCP-PRG-009](../../specs/architecture/http/mcp/prompt.md))

Every step event also carries `type`, `promptId`, `userId`, and `conversationId`. `userId` is the access token’s `id` claim. It stays on the payload. The listener still writes only when `event.userId` is the authenticated user, so another user’s id is not sent on this connection ([FR-MCP-OWN-001](../../specs/requirements/fr/mcp/ownership.md)). `conversationId` is the conversation the prompt runs in. The connect snapshot carries `userId` and `prompts` instead of one `promptId`.

## Saved with the turn

A finished answer stores its `permission` and `call` events on the turn, without `promptId`, `userId`, or `conversationId` ([HTTP-MCP-CNV-007](../../specs/architecture/http/mcp/conversation.md)). `selecting`, `saving`, `answer`, `error`, and `stopped` stay on the stream only. The turn also stores `startedAt`, `finishedAt`, `domains`, and `list` from the answer.

## Shapes the answer carries

`domains` is `{ name, tools: { name }[], resources: { name }[] }[]`. A refusal is absent from `domains`.

`list.tools` carry `argumentFields` (`name`, `type`, `required`). `list.resources` carry `uri`, or `uriTemplate` when the URI depends on the prompt ([HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md)).

A tool `result` is `{ content, isError? }`. A resource `result` is `{ contents }`.

Full value shapes live in the Zod schemas under `backend/src/shared/schemas/mcp/events/` and in OpenAPI.
