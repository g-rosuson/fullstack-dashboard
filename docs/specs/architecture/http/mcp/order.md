# HTTP — MCP order

Events on the prompt stream ([HTTP-MCP-PRG-001](./prompt.md)). A tool or resource runs after the user permits it ([HTTP-MCP-SEL-003](./selection.md)). A refusal skips it ([HTTP-MCP-SEL-005](./selection.md)).

## HTTP-MCP-ORD-001 — One at a time

While a `call` for this prompt has `status` `"processing"` and that tool or resource has not yet sent `"succeeded"` or `"failed"`:

- The stream does not send another `call` with `status` `"processing"`

Traces:

- [FR-MCP-ORD-001](../../../requirements/fr/mcp/order.md)
