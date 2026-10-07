# HTTP

The public surface is `backend/src/modules/mcp/`: `mcp-routing.ts`, `mcp-controller.ts`, `mcp-middleware.ts`, `mcp-registry.ts`, plus `schemas/`, `types/`, and `mappers/`.

Routes live under `/api/mcp` in `backend/src/shared/constants/routes/index.ts`. `backend/src/server/index.ts` mounts them after authentication and before the exceptions middleware, beside the jobs routes. A missing or invalid bearer token fails as [HTTP-AUTH-TOK-003](../../specs/architecture/http/auth/session.md).

Scenarios: [http/mcp](../../specs/architecture/http/mcp/index.md).

## Routes

- `GET /api/mcp/stream` — prompt events ([HTTP-MCP-PRG-001](../../specs/architecture/http/mcp/prompt.md))
- `POST /api/mcp/conversations`, `GET /api/mcp/conversations`, `GET /api/mcp/conversations/:id`, `DELETE /api/mcp/conversations/:id` — [conversation.md](../../specs/architecture/http/mcp/conversation.md)
- `POST /api/mcp/prompt` — start ([HTTP-MCP-PRG-007](../../specs/architecture/http/mcp/prompt.md))
- `POST /api/mcp/prompt/:id/permit` and `POST /api/mcp/prompt/:id/refuse` — [selection.md](../../specs/architecture/http/mcp/selection.md)
- `POST /api/mcp/prompt/:id/stop` — [stop.md](../../specs/architecture/http/mcp/stop.md)

Mutating controllers respond with `{ success: true, data, meta: { timestamp } }`. `data` is `{ promptId }` or `{ conversationId }`, matching the scenario.

## Stream

`streamMcp` calls `openSSE`, replays an open `permission` for each of this user’s active prompts, registers one listener per MCP event type, and drops every listener on `req.on('close')`. A listener writes only when `event.userId` is `req.context.user.id` ([FR-MCP-OWN-001](../../specs/requirements/fr/mcp/ownership.md)).

The stream sends prompt events only, so the handler stays synchronous. Closing it does not stop a prompt that is being answered ([HTTP-MCP-PRG-009](../../specs/architecture/http/mcp/prompt.md), [FR-MCP-CNV-005](../../specs/requirements/fr/mcp/conversation.md)).

## Validation and errors

`mcp-middleware.ts` checks the body with `validateRequestPayload`. The prompt body is `conversationId`, `prompt`, and optional `turnIds`. The permit and refuse body is `{ domain, name, kind }`.

A busy conversation, a permit or refuse with no pending ask, and a body that differs from the pending ask throw `BusinessLogicException` (422, `BUSINESS_LOGIC_ERROR`) ([HTTP-MCP-PRG-008](../../specs/architecture/http/mcp/prompt.md), [HTTP-MCP-SEL-004](../../specs/architecture/http/mcp/selection.md)). An unknown or other-user prompt or conversation id throws `ResourceNotFoundException` (404) ([HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md), [HTTP-MCP-OWN-002](../../specs/architecture/http/mcp/ownership.md)). Those throws come from `PromptRunner`. Middleware does not decide them.

`mcp-registry.ts` is registered from `backend/src/services/openapi/generate-spec.ts`. Field-level schemas stay in Zod and OpenAPI.
