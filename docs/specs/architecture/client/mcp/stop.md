# Client — Stop

Surface: chat

## CLIENT-MCP-STP-001 — Stop while answering

- Setup: a prompt is being answered, and a tool or resource may be running
- Action: stop the prompt
- Assert: the prompt shows stopped; that tool or resource does not show succeeded or failed after the stop; no answer is shown

Traces:

- [FR-MCP-STP-001](../../../requirements/fr/mcp/stop.md)
- [FR-MCP-STP-004](../../../requirements/fr/mcp/stop.md)
- [FR-MCP-STP-005](../../../requirements/fr/mcp/stop.md)
- [HTTP-MCP-STP-001](../../http/mcp/stop.md)
