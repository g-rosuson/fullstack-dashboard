# Client — Queue status

Surface: chat

Status comes from the prompt stream ([HTTP-MCP-PRG-004](../../http/mcp/prompt.md)).

## CLIENT-MCP-QST-001 — Processing, then succeeded

- Setup: a tool or resource is in the queue
- Action: it finishes
- Assert: it shows processing, then succeeded

Traces:

- [FR-MCP-QST-001](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-PRG-004](../../http/mcp/prompt.md)

## CLIENT-MCP-QST-002 — Failed is distinct

- Setup: one tool or resource succeeded, and another failed
- Action: observe the queue
- Assert: the failed one shows failed, and it is distinct from the one that succeeded

Traces:

- [FR-MCP-QST-002](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-FLR-001](../../http/mcp/failure.md)

## CLIENT-MCP-QST-003 — Refused is distinct

- Setup: the user refused a tool or resource, and another finished
- Action: observe the queue
- Assert: the refused one shows refused, and it is distinct from processing, succeeded, and failed

Traces:

- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-SEL-005](../../http/mcp/selection.md)
