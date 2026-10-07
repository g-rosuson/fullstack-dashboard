# MCP — HTTP

Realizes [fr/mcp](../../../requirements/fr/mcp/index.md). Writing rules: [HTTP acceptance](../README.md).

## MCP server

The Express server calls `POST http://mcp-server:3000/mcp`. That host is on the private network and is not reachable from the public internet. The public API does not serve `POST /mcp`.

- MCP — `POST http://mcp-server:3000/mcp`
- [exposure.md](./exposure.md) — `HTTP-MCP-EXP-*`

## Application

Protected routes. A missing or invalid `Authorization: Bearer` fails as [HTTP-AUTH-TOK-003](../auth/session.md).

- Stream — `GET /api/mcp/stream`
- Conversations — `POST /api/mcp/conversations`, `GET /api/mcp/conversations`, `GET /api/mcp/conversations/:id`, `DELETE /api/mcp/conversations/:id`
- Prompt — `POST /api/mcp/prompt`
- Permit — `POST /api/mcp/prompt/:id/permit`
- Refuse — `POST /api/mcp/prompt/:id/refuse`
- Stop — `POST /api/mcp/prompt/:id/stop`

- [prompt.md](./prompt.md) — `HTTP-MCP-PRG-*`
- [selection.md](./selection.md) — `HTTP-MCP-SEL-*`
- [order.md](./order.md) — `HTTP-MCP-ORD-*`
- [arguments.md](./arguments.md) — `HTTP-MCP-ARG-*`
- [failure.md](./failure.md) — `HTTP-MCP-FLR-*`
- [record.md](./record.md) — `HTTP-MCP-REC-*`
- [conversation.md](./conversation.md) — `HTTP-MCP-CNV-*`
- [context.md](./context.md) — `HTTP-MCP-CTX-*`
- [stop.md](./stop.md) — `HTTP-MCP-STP-*`
- [ownership.md](./ownership.md) — `HTTP-MCP-OWN-*`
