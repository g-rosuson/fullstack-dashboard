# Client — Saving the turn

Surface: chat

## CLIENT-MCP-PRG-003 — Turn is being saved

- Setup: the model has returned the answer, and the turn is not stored yet
- Action: observe the chat
- Assert: the chat shows that the turn is being saved

Traces:

- [FR-MCP-PRG-005](../../../requirements/fr/mcp/progress.md)
- [HTTP-MCP-PRG-005](../../http/mcp/prompt.md)

## CLIENT-MCP-PRG-008 — Latest step

- Setup: a prompt is being answered
- Action: observe the open turn
- Assert: the open turn shows the status indicator for the latest step: sending, selecting, the permission ask, the call outcome, saving, or the error

Traces:

- [FR-MCP-PRG-011](../../../requirements/fr/mcp/progress.md)
