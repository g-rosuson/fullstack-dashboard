# TKT-MCP-002 — Express MCP client stream

`feat/tkt-mcp-002-express-client`

Labels: `feature`

## User story

As a user, I want the application to keep my conversations and run a prompt’s MCP tools and resources, streaming each step as it happens, so that I can follow progress, allow or refuse a tool or resource the assistant picked, stop the prompt, and come back to the saved turns.

## Definition of done

- [ ] An MCP client in `backend` calls the MCP server as in [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md)
- [ ] [HTTP-MCP-PRG-001](../../specs/architecture/http/mcp/prompt.md) holds
- [ ] [HTTP-MCP-PRG-002](../../specs/architecture/http/mcp/prompt.md) through [HTTP-MCP-PRG-009](../../specs/architecture/http/mcp/prompt.md) hold, and each prompt event is sent when that step happens ([FR-MCP-PRG-001](../../specs/requirements/fr/mcp/progress.md))
- [ ] [HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md) through [HTTP-MCP-SEL-006](../../specs/architecture/http/mcp/selection.md) hold
- [ ] [HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md) through [HTTP-MCP-FLR-003](../../specs/architecture/http/mcp/failure.md) hold
- [ ] [HTTP-MCP-REC-001](../../specs/architecture/http/mcp/record.md) through [HTTP-MCP-REC-003](../../specs/architecture/http/mcp/record.md) hold
- [ ] [HTTP-MCP-ARG-001](../../specs/architecture/http/mcp/arguments.md) and [HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md) hold
- [ ] [HTTP-MCP-CTX-001](../../specs/architecture/http/mcp/context.md) through [HTTP-MCP-CTX-003](../../specs/architecture/http/mcp/context.md) hold
- [ ] [HTTP-MCP-CNV-001](../../specs/architecture/http/mcp/conversation.md) through [HTTP-MCP-CNV-006](../../specs/architecture/http/mcp/conversation.md) hold
- [ ] [HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md) and [HTTP-MCP-STP-002](../../specs/architecture/http/mcp/stop.md) hold
- [ ] [HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md) holds
- [ ] [HTTP-MCP-OWN-002](../../specs/architecture/http/mcp/ownership.md) holds
- [ ] [HTTP-MCP-ORD-001](../../specs/architecture/http/mcp/order.md) holds

## Traces

- [FR-MCP-EXP-001](../../specs/requirements/fr/mcp/exposure.md)
- [FR-MCP-ORD-001](../../specs/requirements/fr/mcp/order.md)
- [FR-MCP-ORD-002](../../specs/requirements/fr/mcp/order.md)
- [FR-MCP-SEL-001](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-PRG-001](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-FLR-001](../../specs/requirements/fr/mcp/failure.md)
- [FR-MCP-REC-001](../../specs/requirements/fr/mcp/record.md)
- [FR-MCP-CTX-001](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-CTX-002](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-CTX-003](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-FLR-003](../../specs/requirements/fr/mcp/failure.md)
- [FR-MCP-SEL-004](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-STP-001](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-STP-004](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-SEL-005](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-010](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-011](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-CNV-001](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-002](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-003](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-004](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-005](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-001](../../specs/requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-003](../../specs/requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-004](../../specs/requirements/fr/mcp/ownership.md)
- [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md)
- [HTTP-MCP-PRG-001](../../specs/architecture/http/mcp/prompt.md)
- [HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md)
- [HTTP-MCP-ORD-001](../../specs/architecture/http/mcp/order.md)
- [HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md)
- [HTTP-MCP-REC-001](../../specs/architecture/http/mcp/record.md)
- [HTTP-MCP-ARG-001](../../specs/architecture/http/mcp/arguments.md)
- [HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md)
- [HTTP-MCP-CTX-001](../../specs/architecture/http/mcp/context.md)
- [HTTP-MCP-CTX-002](../../specs/architecture/http/mcp/context.md)
- [HTTP-MCP-CTX-003](../../specs/architecture/http/mcp/context.md)
- [HTTP-MCP-FLR-003](../../specs/architecture/http/mcp/failure.md)
- [CLIENT-MCP-CTX-001](../../specs/architecture/client/mcp/context.md)
- [CLIENT-MCP-FLR-002](../../specs/architecture/client/mcp/error.md)
- [HTTP-MCP-CNV-001](../../specs/architecture/http/mcp/conversation.md)
- [HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md)
- [HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md)
- [HTTP-MCP-OWN-002](../../specs/architecture/http/mcp/ownership.md)
