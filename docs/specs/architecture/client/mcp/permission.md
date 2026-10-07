# Client — Permission

Surface: chat

## CLIENT-MCP-PRG-002 — Asking for permission

- Setup: the model selected a tool or resource
- Action: observe the chat
- Assert: the ask is shown, with that domain, name, and arguments, before the tool or resource runs

Traces:

- [FR-MCP-PRG-003](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-SEL-010](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)
- [HTTP-MCP-SEL-001](../../http/mcp/selection.md)

## CLIENT-MCP-SEL-001 — Allow

- Setup: the ask is shown for a tool or resource
- Action: allow that tool or resource
- Assert: it shows processing, and the ask is gone

Traces:

- [FR-MCP-ORD-002](../../../requirements/fr/mcp/order.md)
- [HTTP-MCP-SEL-003](../../http/mcp/selection.md)

## CLIENT-MCP-SEL-002 — Refuse

- Setup: the ask is shown for a tool or resource
- Action: refuse that tool or resource
- Assert: it shows refused, and the prompt continues

Traces:

- [FR-MCP-SEL-005](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-SEL-005](../../http/mcp/selection.md)

## CLIENT-MCP-SEL-003 — Ask stays open

- Setup: the ask is shown
- Action: leave the chat, then return to that conversation before allowing, refusing, or stopping
- Assert: the same ask is shown, with the same arguments

Traces:

- [FR-MCP-SEL-006](../../../requirements/fr/mcp/selection.md)
- [NFR-REL-MCP-001](../../../requirements/nfr/reliability/mcp.md)
- [HTTP-MCP-SEL-006](../../http/mcp/selection.md)
- [HTTP-MCP-PRG-009](../../http/mcp/prompt.md)
