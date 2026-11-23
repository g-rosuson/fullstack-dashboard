# Persistence

`ConversationRepository` in `backend/src/aop/db/mongo/repository/conversations/` stores conversations. It follows the repository pattern: `parseSchema` on every read, `SchemaValidationException` when a document does not match.

Scenarios: [conversation.md](../../specs/architecture/http/mcp/conversation.md).

## Document

`{ _id, userId, turns: [{ turnId, prompt, answer, startedAt, finishedAt, domains, list, events }] }`.

A turn is a prompt and its answer ([FR-MCP-CNV-002](../../specs/requirements/fr/mcp/conversation.md)). Starting a prompt stores it as the last turn, with `answer` and `finishedAt` absent until the answer is saved. A conversation holds at most one such waiting prompt ([FR-MCP-CNV-006](../../specs/requirements/fr/mcp/conversation.md), [HTTP-MCP-PRG-010](../../specs/architecture/http/mcp/prompt.md)).

`events` holds that prompt’s permission asks and call steps, in the order they happened ([HTTP-MCP-CNV-007](../../specs/architecture/http/mcp/conversation.md)). `selecting`, `saving`, `answer`, `error`, and `stopped` are not stored. `promptId`, `userId`, and `conversationId` stay on the stream only. `startedAt`, `finishedAt`, `domains`, and `list` are the same values as the answer event.

## Methods

- `create` — an empty conversation for this user ([HTTP-MCP-CNV-001](../../specs/architecture/http/mcp/conversation.md))
- `listForUser` — this user’s conversations, oldest first ([HTTP-MCP-CNV-002](../../specs/architecture/http/mcp/conversation.md))
- `getByIdForUser` — one conversation, turns oldest first ([HTTP-MCP-CNV-003](../../specs/architecture/http/mcp/conversation.md))
- `deleteForUser` — remove it ([HTTP-MCP-CNV-006](../../specs/architecture/http/mcp/conversation.md))
- `appendOpenTurn` — store a prompt as the last turn when every stored turn is finished. Returns `null` when a prompt is already waiting ([HTTP-MCP-PRG-010](../../specs/architecture/http/mcp/prompt.md), [HTTP-MCP-PRG-008](../../specs/architecture/http/mcp/prompt.md))
- `completeTurn` — write the finished answer onto that turn ([HTTP-MCP-CNV-004](../../specs/architecture/http/mcp/conversation.md))
- `removeOpenTurn` — remove that turn after `stopped` or `error` ([HTTP-MCP-CNV-005](../../specs/architecture/http/mcp/conversation.md))
- `appendTurn` — add a finished turn in one write. The runner uses the three methods above

A missing id and another user’s id are the same `ResourceNotFoundException` ([HTTP-MCP-OWN-002](../../specs/architecture/http/mcp/ownership.md), [FR-MCP-OWN-004](../../specs/requirements/fr/mcp/ownership.md)).

After `stopped` or `error`, the conversation keeps the turns it had before that prompt. A failed `completeTurn` ends the prompt with `error`, removes the stored turn, and does not emit `answer` ([HTTP-MCP-FLR-003](../../specs/architecture/http/mcp/failure.md)).

## Who calls it

Controllers reach it through `req.context.db.repository.conversations`. The runner builds its own `DbContext` after the HTTP response, the same way the delegator does, because the step loop continues after `POST /api/mcp/prompt` has returned.
