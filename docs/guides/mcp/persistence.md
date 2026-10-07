# Persistence

`ConversationRepository` in `backend/src/aop/db/mongo/repository/conversations/` stores conversations. It follows the repository pattern: `parseSchema` on every read, `SchemaValidationException` when a document does not match.

Scenarios: [conversation.md](../../specs/architecture/http/mcp/conversation.md).

## Document

`{ _id, userId, turns: [{ turnId, prompt, answer, savedAt }] }`.

A turn is a finished prompt and its answer ([FR-MCP-CNV-002](../../specs/requirements/fr/mcp/conversation.md)). A prompt that is still running, stopped, or ended in error is not a turn ([HTTP-MCP-CNV-004](../../specs/architecture/http/mcp/conversation.md), [HTTP-MCP-CNV-005](../../specs/architecture/http/mcp/conversation.md)).

## Methods

- `create` — an empty conversation for this user ([HTTP-MCP-CNV-001](../../specs/architecture/http/mcp/conversation.md))
- `listForUser` — this user’s conversations, oldest first ([HTTP-MCP-CNV-002](../../specs/architecture/http/mcp/conversation.md))
- `getByIdForUser` — one conversation, turns oldest first ([HTTP-MCP-CNV-003](../../specs/architecture/http/mcp/conversation.md))
- `deleteForUser` — remove it ([HTTP-MCP-CNV-006](../../specs/architecture/http/mcp/conversation.md))
- `appendTurn` — add a finished answer

A missing id and another user’s id are the same `ResourceNotFoundException` ([HTTP-MCP-OWN-002](../../specs/architecture/http/mcp/ownership.md), [FR-MCP-OWN-004](../../specs/requirements/fr/mcp/ownership.md)).

Callers append only for a finished answer. After `stopped` or `error`, the conversation keeps the turns it had. A failed `appendTurn` ends the prompt with `error` and does not emit `answer` ([HTTP-MCP-FLR-003](../../specs/architecture/http/mcp/failure.md)).

## Who calls it

Controllers reach it through `req.context.db.repository.conversations`. The runner builds its own `DbContext` after the HTTP response, the same way the delegator does, because the step loop continues after `POST /api/mcp/prompt` has returned.
