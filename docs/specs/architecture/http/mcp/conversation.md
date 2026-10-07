# HTTP — MCP conversation

Auth: [HTTP-AUTH-TOK-003](../auth/session.md). Another user’s conversation, or an unknown id, is a missing conversation ([HTTP-MCP-OWN-002](./ownership.md)).

A conversation is one saved chat. A user may keep more than one. It stays until that user deletes it. Reading it returns the saved turns. The client does not send those turns back.

A turn is a finished prompt and its answer. A prompt that is still running, stopped, or ended in error is not a turn.

- Create — `POST /api/mcp/conversations`
- List — `GET /api/mcp/conversations`
- Read — `GET /api/mcp/conversations/:id`
- Delete — `DELETE /api/mcp/conversations/:id`

## HTTP-MCP-CNV-001 — Create

Starts an empty conversation. Prompts in it send this `conversationId` ([HTTP-MCP-PRG-007](./prompt.md)).

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - No body
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { conversationId: string }, meta: { timestamp: string } }`

Traces:

- [FR-MCP-CNV-001](../../../requirements/fr/mcp/conversation.md)

## HTTP-MCP-CNV-002 — List

The conversations this user created.

- Request:
  - Header: `Authorization: Bearer <access-token>`
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { conversationId: string }[], meta: { timestamp: string } }`
  - Every `conversationId` belongs to the requesting user
  - `data` is ordered oldest first

Traces:

- [FR-MCP-CNV-001](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)

## HTTP-MCP-CNV-003 — Read

The turns of one conversation, oldest first. Closing the prompt stream leaves them in place. A prompt that is still being answered keeps running after that close ([HTTP-MCP-PRG-009](./prompt.md)).

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = this user’s conversation
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { conversationId: string, turns: { turnId: string, prompt: string, answer: string }[] }, meta: { timestamp: string } }`
  - `turns` may be empty
  - `data.conversationId` equals the path `id`

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)

## HTTP-MCP-CNV-004 — Answer is saved

A finished answer in this conversation is a new last turn on the next read.

- `prompt` is the prompt that was sent
- `answer` is the answer event’s `content`
- `turnId` was not in the previous read

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)

## HTTP-MCP-CNV-005 — Stop or error is not saved

After `stopped` or `error`, the next read has the same turns as before that prompt.

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)

## HTTP-MCP-CNV-006 — Delete

Removes the conversation. A later read of that id is [HTTP-MCP-OWN-002](./ownership.md).

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = this user’s conversation
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { conversationId: string }, meta: { timestamp: string } }`
  - `data.conversationId` equals the path `id`

Traces:

- [FR-MCP-CNV-003](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)
