# Client — Answer text

Surface: chat

## CLIENT-MCP-ANS-001 — Formatted answer

- Setup: a finished answer contains a heading, a list, and a table
- Action: observe the answer
- Assert: the heading, the list, and the table are shown

Traces:

- [FR-MCP-ANS-001](../../../requirements/fr/mcp/answer.md)

## CLIENT-MCP-ANS-002 — Prompt as typed

- Setup: a prompt contains a heading marker
- Action: observe the prompt
- Assert: the marker is shown as typed, and it is not a heading

Traces:

- [FR-MCP-ANS-002](../../../requirements/fr/mcp/answer.md)

## CLIENT-MCP-ANS-003 — Tool and resource results as text

- Setup: a finished turn saved a tool or resource result that contains a heading marker
- Action: open the turn's saved events
- Assert: the marker is shown as text, and it is not a heading

Traces:

- [FR-MCP-ANS-003](../../../requirements/fr/mcp/answer.md)

## CLIENT-MCP-ANS-004 — Answer when formatting fails

- Setup: a finished answer cannot be shown as formatted text
- Action: observe the answer
- Assert: the original answer text is shown, including text that was separated by a blank line

Traces:

- [FR-MCP-ANS-004](../../../requirements/fr/mcp/answer.md)

## CLIENT-MCP-ANS-005 — HTML in an answer

- Setup: a finished answer contains HTML
- Action: observe the answer
- Assert: the HTML is shown as text and does not become page markup

Traces:

- [FR-MCP-ANS-001](../../../requirements/fr/mcp/answer.md)
- [NFR-SEC-MCP-001](../../../requirements/nfr/security/mcp.md)
