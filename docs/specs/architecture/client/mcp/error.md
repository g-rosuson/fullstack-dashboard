# Client — Critical error

Surface: chat

## CLIENT-MCP-FLR-001 — Model provider or server failure

- Setup: the model provider or the server fails while a prompt is being answered
- Action: observe the chat
- Assert: the error context is shown; the finished answer is not shown

Traces:

- [FR-MCP-FLR-002](../../../requirements/fr/mcp/failure.md)
- [HTTP-MCP-FLR-002](../../http/mcp/failure.md)

## CLIENT-MCP-FLR-002 — Answer is not kept

- Setup: the model has written an answer, and that answer cannot be kept
- Action: observe the chat
- Assert: the error context is shown; the finished answer is not shown; earlier turns of the conversation are unchanged

Traces:

- [FR-MCP-FLR-003](../../../requirements/fr/mcp/failure.md)
- [HTTP-MCP-FLR-003](../../http/mcp/failure.md)
- [HTTP-MCP-CNV-005](../../http/mcp/conversation.md)
