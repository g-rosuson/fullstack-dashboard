# Client — Queue

Surface: chat

A tool or resource appears here when the prompt uses it ([HTTP-MCP-PRG-004](../../http/mcp/prompt.md)).

## CLIENT-MCP-QUE-001 — Model selected

- Setup: the model selected a tool or resource, and the prompt uses it
- Action: observe the queue
- Assert: that tool or resource is shown

Traces:

- [FR-MCP-QUE-001](../../../requirements/fr/mcp/queue.md)
- [HTTP-MCP-SEL-001](../../http/mcp/selection.md)

## CLIENT-MCP-QUE-002 — Domain and name

- Setup: a tool or resource is in the queue
- Action: observe it
- Assert: its domain and its name are shown

Traces:

- [FR-MCP-QUE-002](../../../requirements/fr/mcp/queue.md)
