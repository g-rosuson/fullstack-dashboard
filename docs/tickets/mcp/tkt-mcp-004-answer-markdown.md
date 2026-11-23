# TKT-MCP-004 — Show answers as markdown

`feat/tkt-mcp-004-answer-markdown`

Labels: `feature`

## User story

As a user, I want model answers shown as formatted text so that headings, lists, and tables are readable, and I still see the words if formatting fails.

## System prompt

When the model writes the answer, and only then, ask for GitHub-flavored Markdown in the step instructions:

- Use headings, lists, tables, and bold where they help.
- Write the answer as markdown. Do not wrap the whole answer in a code fence.
- Do not use HTML.

Tool and resource calls stay as they are. Models can ignore the instruction, so the chat still has to show a bad answer.

## Rendering

Show the answer with `react-markdown` and `remark-gfm` (tables).

- A finished answer and the same answer opened later from a saved conversation use this rendering.
- If rendering throws, show the original answer as plain text.
- The user's prompt stays plain text.
- Tool and resource results stay plain text.
- HTML in the answer stays text. Do not turn it into page markup.

## Definition of done

- [ ] The step instructions ask for GitHub-flavored Markdown on the answer only
- [ ] [CLIENT-MCP-ANS-001](../../specs/architecture/client/mcp/answer-text.md) holds
- [ ] [CLIENT-MCP-ANS-002](../../specs/architecture/client/mcp/answer-text.md) holds
- [ ] [CLIENT-MCP-ANS-003](../../specs/architecture/client/mcp/answer-text.md) holds
- [ ] [CLIENT-MCP-ANS-004](../../specs/architecture/client/mcp/answer-text.md) holds
- [ ] [CLIENT-MCP-ANS-005](../../specs/architecture/client/mcp/answer-text.md) holds
- [ ] Reopening the conversation shows that same formatting ([CLIENT-MCP-CNV-001](../../specs/architecture/client/mcp/conversation.md))

## Traces

- [FR-MCP-ANS-001](../../specs/requirements/fr/mcp/answer.md)
- [FR-MCP-ANS-002](../../specs/requirements/fr/mcp/answer.md)
- [FR-MCP-ANS-003](../../specs/requirements/fr/mcp/answer.md)
- [FR-MCP-ANS-004](../../specs/requirements/fr/mcp/answer.md)
- [NFR-SEC-MCP-001](../../specs/requirements/nfr/security/mcp.md)
- [FR-MCP-CNV-002](../../specs/requirements/fr/mcp/conversation.md)
- [CLIENT-MCP-ANS-001](../../specs/architecture/client/mcp/answer-text.md)
- [CLIENT-MCP-CNV-001](../../specs/architecture/client/mcp/conversation.md)
