# Client — Queue

Surface: chat

The status shows one tool or resource at a time while the prompt uses it ([HTTP-MCP-PRG-004](../../http/mcp/prompt.md)). Saved events appear on the turn once they are available.

## CLIENT-MCP-QUE-001 — Current tool or resource

- Setup: the prompt is being answered, and the model is using a tool or resource
- Action: observe the status
- Assert: that tool or resource is shown, and an earlier one is not shown with it

Traces:

- [FR-MCP-QUE-001](../../../requirements/fr/mcp/queue.md)
- [HTTP-MCP-SEL-001](../../http/mcp/selection.md)

## CLIENT-MCP-QUE-002 — Name

- Setup: a tool or resource is the current one on the status
- Action: observe the status
- Assert: its name is shown

Traces:

- [FR-MCP-QUE-002](../../../requirements/fr/mcp/queue.md)

## CLIENT-MCP-QUE-003 — Saved events

- Setup: a turn has saved events
- Action: observe the turn
- Assert: the saved events are shown

Traces:

- [FR-MCP-QUE-003](../../../requirements/fr/mcp/queue.md)

## CLIENT-MCP-QUE-004 — Not yet saved

- Setup: a prompt is being answered, and the turn has no saved events yet
- Action: observe the turn
- Assert: no saved events are shown

Traces:

- [FR-MCP-QUE-003](../../../requirements/fr/mcp/queue.md)

## CLIENT-MCP-QUE-005 — Collapsed

- Setup: a turn has saved events, and the user has not opened them
- Action: observe the turn
- Assert: the saved events are collapsed

Traces:

- [FR-MCP-QUE-004](../../../requirements/fr/mcp/queue.md)
