# Client — Critical error

Surface: chat

## CLIENT-MCP-FLR-001 — Model provider or server failure

- Setup: the model provider or the server fails while a prompt is being answered
- Action: observe the chat
- Assert: the error context is shown; the finished answer is not shown

Traces:

- [FR-MCP-FLR-002](../../../requirements/fr/mcp/failure.md)
- [HTTP-MCP-FLR-002](../../http/mcp/failure.md)
