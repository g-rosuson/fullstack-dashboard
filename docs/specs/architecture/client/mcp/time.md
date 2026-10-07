# Client — Prompt and answer time

Surface: chat

## CLIENT-MCP-PRG-005 — Prompt time

- Setup: a prompt finished with an answer
- Action: observe the chat
- Assert: the time the prompt started is shown

Traces:

- [FR-MCP-PRG-006](../../../requirements/fr/mcp/progress.md)
- [HTTP-MCP-PRG-006](../../http/mcp/prompt.md)

## CLIENT-MCP-PRG-006 — Answer time

- Setup: a prompt finished with an answer
- Action: observe the chat
- Assert: the time the answer finished is shown, separate from the prompt time

Traces:

- [FR-MCP-PRG-006](../../../requirements/fr/mcp/progress.md)
- [HTTP-MCP-PRG-006](../../http/mcp/prompt.md)
