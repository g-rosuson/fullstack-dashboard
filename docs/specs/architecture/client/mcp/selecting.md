# Client — Selecting

Surface: chat

## CLIENT-MCP-PRG-001 — Selecting tools and resources

- Setup: a prompt is being answered, and the model asks for the list of tools and resources
- Action: observe the chat
- Assert: that request is shown when it happens

Traces:

- [FR-MCP-PRG-002](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [HTTP-MCP-PRG-002](../../http/mcp/prompt.md)

## CLIENT-MCP-PRG-007 — Step before the start response

- Setup: the user sends a prompt
- Action: a step arrives before the start response
- Assert: that step is shown on that turn

Traces:

- [FR-MCP-PRG-001](../../../requirements/fr/mcp/progress.md)
