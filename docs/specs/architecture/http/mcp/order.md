# HTTP — MCP order

Events on the prompt stream ([HTTP-MCP-PRG-001](./prompt.md)). A tool or resource runs only after it is permitted ([HTTP-MCP-SEL-001](./selection.md), [HTTP-MCP-SEL-004](./selection.md)). A refusal does not run it ([HTTP-MCP-SEL-006](./selection.md)).

## HTTP-MCP-ORD-001 — One at a time

While a `call` for this prompt has `status` `"processing"` and that tool or resource has not yet sent `"succeeded"` or `"failed"`:

- The stream does not send another `call` with `status` `"processing"`

Traces:

- [FR-MCP-ORD-001](../../../requirements/fr/mcp/order.md)
