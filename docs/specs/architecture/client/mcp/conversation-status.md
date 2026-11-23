# Client — Conversation status

Surface: the sidebar conversation list

The open chat is a different surface. It uses the status indicator on the turn.

## CLIENT-MCP-CST-001 — List border

- Setup: the list contains one processing conversation, one waiting for permission, one failed, and one idle
- Action: view the list
- Assert: processing has a primary border; waiting for permission has a warning border; failed has a destructive border; idle has no status border

Traces:

- [FR-MCP-CST-001](../../../requirements/fr/mcp/conversation-status.md)

## CLIENT-MCP-CST-002 — Call does not change the border

- Setup: a conversation is processing
- Action: a call in it fails, or the user refuses it
- Assert: that conversation still has the primary border

Traces:

- [FR-MCP-CST-003](../../../requirements/fr/mcp/conversation-status.md)

## CLIENT-MCP-CST-003 — Failed prompt

- Setup: the user sends a prompt
- Action: the prompt fails, or it does not start
- Assert: that conversation has the destructive border

Traces:

- [FR-MCP-CST-005](../../../requirements/fr/mcp/conversation-status.md)

## CLIENT-MCP-CST-004 — Failure clears

- Setup: a conversation has the destructive border
- Action: a later prompt finishes with an answer, or the user stops the prompt
- Assert: that conversation has no status border

Traces:

- [FR-MCP-CST-006](../../../requirements/fr/mcp/conversation-status.md)

## CLIENT-MCP-CST-005 — Border after reconnect

- Setup: a prompt is still being answered, and the stream reconnects
- Action: view the list
- Assert: selecting, calling, answering, and saving show the primary border; permission shows the warning border

Traces:

- [FR-MCP-CST-002](../../../requirements/fr/mcp/conversation-status.md)
- [FR-MCP-CST-004](../../../requirements/fr/mcp/conversation-status.md)
- [HTTP-MCP-PRG-009](../../http/mcp/prompt.md)
