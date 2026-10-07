# TKT-MCP-003 — Chat for the Express MCP client

`feat/tkt-mcp-003-chat-client`

Labels: `feature`

## User story

As a user, I want the chat to keep my conversations and follow a prompt on the Express MCP client as each step happens, so that I can start, open, and delete a conversation, see progress, allow or refuse a tool or resource, stop the prompt, choose which finished turns go with the next prompt, and come back to the saved answer.

## Definition of done

- [ ] The chat in `frontend` uses the Express MCP client from [TKT-MCP-002](./tkt-mcp-002-express-client.md)
- [ ] [CLIENT-MCP-QUE-001](../../specs/architecture/client/mcp/queue.md) and [CLIENT-MCP-QUE-002](../../specs/architecture/client/mcp/queue.md) hold
- [ ] [CLIENT-MCP-QST-001](../../specs/architecture/client/mcp/status.md) through [CLIENT-MCP-QST-003](../../specs/architecture/client/mcp/status.md) hold
- [ ] [CLIENT-MCP-PRG-001](../../specs/architecture/client/mcp/selecting.md) holds
- [ ] [CLIENT-MCP-PRG-002](../../specs/architecture/client/mcp/permission.md) holds, and [CLIENT-MCP-SEL-001](../../specs/architecture/client/mcp/permission.md) through [CLIENT-MCP-SEL-003](../../specs/architecture/client/mcp/permission.md) hold
- [ ] [CLIENT-MCP-STP-001](../../specs/architecture/client/mcp/stop.md) holds
- [ ] [CLIENT-MCP-CNV-001](../../specs/architecture/client/mcp/conversation.md) through [CLIENT-MCP-CNV-007](../../specs/architecture/client/mcp/conversation.md) hold
- [ ] [CLIENT-MCP-CTX-001](../../specs/architecture/client/mcp/context.md) through [CLIENT-MCP-CTX-003](../../specs/architecture/client/mcp/context.md) hold
- [ ] [CLIENT-MCP-PRG-003](../../specs/architecture/client/mcp/answering.md) holds
- [ ] [CLIENT-MCP-PRG-004](../../specs/architecture/client/mcp/answer.md) holds
- [ ] [CLIENT-MCP-PRG-005](../../specs/architecture/client/mcp/time.md) and [CLIENT-MCP-PRG-006](../../specs/architecture/client/mcp/time.md) hold
- [ ] [CLIENT-MCP-FLR-001](../../specs/architecture/client/mcp/error.md) and [CLIENT-MCP-FLR-002](../../specs/architecture/client/mcp/error.md) hold

## Traces

- [FR-MCP-ORD-002](../../specs/requirements/fr/mcp/order.md)
- [FR-MCP-SEL-001](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-005](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-006](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-010](../../specs/requirements/fr/mcp/selection.md)
- [FR-MCP-PRG-002](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-PRG-003](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-PRG-005](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-PRG-006](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-PRG-007](../../specs/requirements/fr/mcp/progress.md)
- [FR-MCP-QUE-001](../../specs/requirements/fr/mcp/queue.md)
- [FR-MCP-QUE-002](../../specs/requirements/fr/mcp/queue.md)
- [FR-MCP-QST-001](../../specs/requirements/fr/mcp/status.md)
- [FR-MCP-QST-002](../../specs/requirements/fr/mcp/status.md)
- [FR-MCP-QST-003](../../specs/requirements/fr/mcp/status.md)
- [FR-MCP-FLR-002](../../specs/requirements/fr/mcp/failure.md)
- [FR-MCP-FLR-003](../../specs/requirements/fr/mcp/failure.md)
- [FR-MCP-CTX-001](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-CTX-002](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-CTX-003](../../specs/requirements/fr/mcp/context.md)
- [FR-MCP-STP-001](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-STP-004](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-STP-005](../../specs/requirements/fr/mcp/stop.md)
- [FR-MCP-CNV-001](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-002](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-003](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-004](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-CNV-005](../../specs/requirements/fr/mcp/conversation.md)
- [FR-MCP-OWN-003](../../specs/requirements/fr/mcp/ownership.md)
- [FR-MCP-OWN-004](../../specs/requirements/fr/mcp/ownership.md)
- [NFR-REL-MCP-001](../../specs/requirements/nfr/reliability/mcp.md)
- [CLIENT-MCP-QUE-001](../../specs/architecture/client/mcp/queue.md)
- [CLIENT-MCP-QST-001](../../specs/architecture/client/mcp/status.md)
- [CLIENT-MCP-PRG-001](../../specs/architecture/client/mcp/selecting.md)
- [CLIENT-MCP-PRG-002](../../specs/architecture/client/mcp/permission.md)
- [CLIENT-MCP-SEL-001](../../specs/architecture/client/mcp/permission.md)
- [CLIENT-MCP-STP-001](../../specs/architecture/client/mcp/stop.md)
- [CLIENT-MCP-CNV-001](../../specs/architecture/client/mcp/conversation.md)
- [CLIENT-MCP-CTX-001](../../specs/architecture/client/mcp/context.md)
- [CLIENT-MCP-PRG-003](../../specs/architecture/client/mcp/answering.md)
- [CLIENT-MCP-PRG-004](../../specs/architecture/client/mcp/answer.md)
- [CLIENT-MCP-PRG-005](../../specs/architecture/client/mcp/time.md)
- [CLIENT-MCP-FLR-001](../../specs/architecture/client/mcp/error.md)
