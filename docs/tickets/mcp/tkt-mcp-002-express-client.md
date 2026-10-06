# TKT-MCP-002 — Express MCP client stream

`feat/tkt-mcp-002-express-client`

Labels: `feature`

## User story

As a user, I want the application to run a prompt’s MCP tools and resources and stream each step as it happens, so that I can follow progress, allow or refuse a tool or resource the assistant picked, and stop the prompt.

## Definition of done

- [ ] Prompt model calls use OpenRouter with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` ([ADR-0001](../../specs/architecture/adr/0001-openrouter-mcp.md))
- [ ] An MCP client in `backend` calls the MCP server as in [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md)
- [ ] [HTTP-MCP-PRG-001](../../specs/architecture/http/mcp/prompt.md) holds, and the first event is the catalog ([HTTP-MCP-AVL-001](../../specs/architecture/http/mcp/available.md), [HTTP-MCP-AVL-002](../../specs/architecture/http/mcp/available.md))
- [ ] [HTTP-MCP-PRG-002](../../specs/architecture/http/mcp/prompt.md) through [HTTP-MCP-PRG-009](../../specs/architecture/http/mcp/prompt.md) hold, and each prompt event is sent when that step happens ([FR-MCP-PRG-001](../../specs/requirements/fr/mcp/progress.md))
- [ ] [HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md) through [HTTP-MCP-SEL-007](../../specs/architecture/http/mcp/selection.md) hold
- [ ] [HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md) and [HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md) hold
- [ ] [HTTP-MCP-REC-001](../../specs/architecture/http/mcp/record.md) through [HTTP-MCP-REC-003](../../specs/architecture/http/mcp/record.md) hold
- [ ] [HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md) holds
- [ ] [HTTP-MCP-CTX-001](../../specs/architecture/http/mcp/context.md) and [HTTP-MCP-CTX-002](../../specs/architecture/http/mcp/context.md) hold
- [ ] [HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md) and [HTTP-MCP-STP-002](../../specs/architecture/http/mcp/stop.md) hold
- [ ] [HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md) holds
- [ ] [HTTP-MCP-ORD-001](../../specs/architecture/http/mcp/order.md) holds

## Traces

- [FR-MCP-AVL-001](../../specs/requirements/fr/mcp/available.md)
- [FR-MCP-EXP-001](../../specs/requirements/fr/mcp/exposure.md)
- [FR-MCP-ORD-001](../../specs/requirements/fr/mcp/order.md)
- [FR-MCP-ORD-002](../../specs/requirements/fr/mcp/order.md)
- [FR-MCP-SEL-001](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-PRG-001](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-FLR-001](../../specs/requirements/fr/mcp/failure.md)
- [FR-MCP-REC-001](../../specs/requirements/fr/mcp/record.md)
- [FR-MCP-CTX-001](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-CTX-002](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-ARG-001](../../specs/requirements/fr/mcp/arguments.md)
- [FR-MCP-SEL-006](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-STP-001](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-STP-004](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-SEL-007](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-CNV-004](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-005](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-001](../../specs/requirements/fr/mcp/ownership.md)
- [HTTP-MCP-AVL-001](../../specs/architecture/http/mcp/available.md)
- [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md)
- [HTTP-MCP-PRG-001](../../specs/architecture/http/mcp/prompt.md)
- [HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md)
- [HTTP-MCP-ORD-001](../../specs/architecture/http/mcp/order.md)
- [HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md)
- [HTTP-MCP-REC-001](../../specs/architecture/http/mcp/record.md)
- [HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md)
- [HTTP-MCP-CTX-001](../../specs/architecture/http/mcp/context.md)
- [HTTP-MCP-CTX-002](../../specs/architecture/http/mcp/context.md)
- [HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md)
- [HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md)
