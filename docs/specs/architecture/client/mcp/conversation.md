# Client — Conversation

Surface: chat

The user keeps more than one conversation. Each stays until that user deletes it. Opening one shows its saved turns.

## CLIENT-MCP-CNV-001 — Leave while a prompt is running

- Setup: a prompt is being answered
- Action: leave the chat, then open that conversation after the prompt finishes
- Assert: the finished answer is shown

Traces:

- [FR-MCP-CNV-005](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [HTTP-MCP-PRG-009](../../http/mcp/prompt.md)
- [HTTP-MCP-CNV-004](../../http/mcp/conversation.md)

## CLIENT-MCP-CNV-002 — One prompt at a time

- Setup: a prompt is being answered in this conversation, including one waiting on permission
- Action: send another prompt in that conversation
- Assert: the new prompt does not start, and the first prompt continues

Traces:

- [FR-MCP-CNV-004](../../../requirements/fr/mcp/conversation.md)
- [HTTP-MCP-PRG-008](../../http/mcp/prompt.md)

## CLIENT-MCP-CNV-003 — Create

- Setup: the user is in the chat
- Action: create a conversation
- Assert: that conversation is open and shows no turns

Traces:

- [FR-MCP-CNV-001](../../../requirements/fr/mcp/conversation.md)
- [HTTP-MCP-CNV-001](../../http/mcp/conversation.md)

## CLIENT-MCP-CNV-004 — List

- Setup: the user has more than one conversation, and another user has one
- Action: view the conversations
- Assert: this user's conversations are shown, oldest first; the other user's conversation is not shown

Traces:

- [FR-MCP-CNV-001](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)
- [HTTP-MCP-CNV-002](../../http/mcp/conversation.md)

## CLIENT-MCP-CNV-005 — Open

- Setup: a conversation has more than one finished turn
- Action: open that conversation
- Assert: each finished turn is shown with its prompt and its answer, oldest first

Traces:

- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [HTTP-MCP-CNV-003](../../http/mcp/conversation.md)

## CLIENT-MCP-CNV-006 — Delete

- Setup: the user has more than one conversation
- Action: delete one of them
- Assert: that conversation is gone, and its turns are not shown; the other conversation remains; after leaving the chat and returning, the deleted conversation is still gone

Traces:

- [FR-MCP-CNV-003](../../../requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-002](../../../requirements/fr/mcp/conversation.md)
- [HTTP-MCP-CNV-006](../../http/mcp/conversation.md)

## CLIENT-MCP-CNV-007 — Missing conversation

- Setup: a conversation belongs to another user, or the conversation is unknown
- Action: open it
- Assert: no turns are shown; another user's conversation and an unknown conversation look the same

Traces:

- [FR-MCP-OWN-003](../../../requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-004](../../../requirements/fr/mcp/ownership.md)
- [HTTP-MCP-OWN-002](../../http/mcp/ownership.md)
