# Client — Conversation

Surface: chat

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
