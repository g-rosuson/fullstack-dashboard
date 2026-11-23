# Client — Finished answer

Surface: chat

## CLIENT-MCP-PRG-004 — Tools and resources used

- Setup: a prompt finished with an answer, and it used at least one tool or resource
- Action: open the turn's saved events
- Assert: each tool and resource that was used is shown with its domain and name

Traces:

- [FR-MCP-PRG-007](../../../requirements/fr/mcp/progress.md)
- [HTTP-MCP-REC-003](../../http/mcp/record.md)

## CLIENT-MCP-PRG-009 — Saved steps

- Setup: a prompt is no longer being answered, and its turn saved a failed or refused call
- Action: open the turn's saved events
- Assert: the failed or refused call is shown with that status

Traces:

- [FR-MCP-PRG-011](../../../requirements/fr/mcp/progress.md)
- [FR-MCP-QST-002](../../../requirements/fr/mcp/status.md)
- [FR-MCP-QST-003](../../../requirements/fr/mcp/status.md)
