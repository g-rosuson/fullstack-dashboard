# HTTP — MCP conversation

Auth: [HTTP-AUTH-TOK-003](../auth/session.md). Another user’s conversation, or an unknown id, is a missing conversation ([HTTP-MCP-OWN-002](./ownership.md)).

A conversation is one saved chat. A user may keep more than one. It stays until that user deletes it. Reading it returns the saved turns. The client does not send those turns back.

A turn is a prompt and its answer. Starting a prompt stores it as the last turn, without `answer` or `finishedAt` ([HTTP-MCP-PRG-010](./prompt.md)). The finished answer is written onto that turn. Stop or error removes it.

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
  - Body: `{ success: true, data: { conversationId: string, turns: { turnId: string, prompt: string, answer: string, startedAt: string, finishedAt: string, domains, list, events }[] }, meta: { timestamp: string } }`
  - `turns` may be empty
  - A turn without `answer` and `finishedAt` is the prompt still being answered ([HTTP-MCP-PRG-010](./prompt.md))
  - `data.conversationId` equals the path `id`
  - Step fields on a turn are [HTTP-MCP-CNV-007](#http-mcp-cnv-007--steps-kept-with-the-answer)

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-006](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)

## HTTP-MCP-CNV-004 — Answer is saved

A finished answer is written onto the turn its prompt stored on start. The next read has that turn last.

- `prompt` is the prompt that was sent
- `answer` is the answer event’s `content`
- `turnId` is the `turn.turnId` from starting that prompt ([HTTP-MCP-PRG-010](./prompt.md))
- That `answer` event carries the same `turnId` and `prompt` ([HTTP-MCP-PRG-006](./prompt.md))
- `startedAt`, `finishedAt`, `domains`, `list`, and `events` are on that turn ([HTTP-MCP-CNV-007](#http-mcp-cnv-007--steps-kept-with-the-answer))

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-006](../../../requirements/fr/mcp/conversation.md)

## HTTP-MCP-CNV-005 — Stop or error is not saved

After `stopped` or `error`, the turn that prompt stored is removed. The next read has the same turns as before that prompt started.

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-006](../../../requirements/fr/mcp/conversation.md)

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

## HTTP-MCP-CNV-007 — Steps kept with the answer

The next read after an answer includes that prompt’s steps on its turn. A prompt that stops or ends in error leaves the turns as they were before it started ([HTTP-MCP-CNV-005](#http-mcp-cnv-005--stop-or-error-is-not-saved)).

- `events` lists each `permission` and each `call`, in the order they happened. It is empty when the answer used none
- A saved `permission` has `domain`, `name`, `kind`, and `arguments`
- A saved `call` has `status`, `domain`, `name`, `kind`, and `arguments`. `result` is present only when `status` is `succeeded`
- `promptId`, `userId`, and `conversationId` are not on a saved step
- `selecting`, `answering`, `saving`, `answer`, `error`, and `stopped` are not saved steps
- `startedAt` and `finishedAt` are the times on that answer event
- `list` and `domains` match that answer event ([HTTP-MCP-REC-003](./record.md))

Traces:

- [FR-MCP-REC-004](../../../requirements/fr/mcp/record.md)
- [FR-MCP-REC-001](../../../requirements/fr/mcp/record.md)
- [FR-MCP-REC-002](../../../requirements/fr/mcp/record.md)
- [FR-MCP-PRG-006](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-PRG-007](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-CNV-009 — Delete stops the prompt

`DELETE /api/mcp/conversations/:id` of a conversation with a prompt being answered stops that prompt. A later stream does not include it. A later read is the existing miss ([HTTP-MCP-OWN-002](./ownership.md)).

- Request:
  - Header: `Authorization: Bearer <access-token>`
  - Path: `id` = this user’s conversation, with a prompt being answered
- Response:
  - Status: `200`
  - Body: `{ success: true, data: { conversationId: string }, meta: { timestamp: string } }`
  - `data.conversationId` equals the path `id`
  - That prompt stops
  - A later `GET /api/mcp/stream` snapshot does not include that prompt
  - A later read of that id is [HTTP-MCP-OWN-002](./ownership.md)

Traces:

- [FR-MCP-CNV-009](../../../requirements/fr/mcp/conversation.md)
