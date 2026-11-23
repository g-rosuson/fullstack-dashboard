# Client — Queue status

Surface: chat

Status comes from the prompt stream ([HTTP-MCP-PRG-004](../../http/mcp/prompt.md)). The status shows the current tool or resource only.

## CLIENT-MCP-QST-001 — Processing, then succeeded

- Setup: a tool or resource is the current one
- Action: it finishes
- Assert: the status shows processing, then succeeded

Traces:

- [FR-MCP-QST-001](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-PRG-004](../../http/mcp/prompt.md)

## CLIENT-MCP-QST-002 — Failed is distinct

- Setup: the current tool or resource failed
- Action: observe the status
- Assert: it shows failed, and that status is distinct from succeeded

Traces:

- [FR-MCP-QST-002](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-FLR-001](../../http/mcp/failure.md)

## CLIENT-MCP-QST-003 — Refused is distinct

- Setup: the user refused the current tool or resource
- Action: observe the status
- Assert: it shows refused, and that status is distinct from processing, succeeded, and failed

Traces:

- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)
- [HTTP-MCP-SEL-005](../../http/mcp/selection.md)
