# Transport

`McpClient` in `backend/src/aop/mcp/client/` calls the private MCP server. The server is stateless JSON, so the client uses `fetch`. Protocol `2026-07-28`. There is no session.

This realizes [HTTP-MCP-EXP-001](../../specs/architecture/http/mcp/exposure.md) and [FR-MCP-EXP-001](../../specs/requirements/fr/mcp/exposure.md).

## Calls

Every method takes an `AbortSignal`, so a stop can cancel work already running ([FR-MCP-STP-004](../../specs/requirements/fr/mcp/stop.md)).

- `listTools` — `tools/list`
- `listResources` — `resources/list`
- `listResourceTemplates` — `resources/templates/list`
- `callTool` — `tools/call`
- `readResource` — `resources/read`

`listResources` keeps a `{ domain, name }` to URI map from that response. A later read of a concrete resource resolves the URI from the map. A template stays out of the map. The runner expands its URI template with the arguments for that step ([HTTP-MCP-ARG-001](../../specs/architecture/http/mcp/arguments.md), [HTTP-MCP-ARG-002](../../specs/architecture/http/mcp/arguments.md)).

The domain of each item is `_meta.domain`.

## Envelope

Each POST sends:

- Headers `Mcp-Method` and `MCP-Protocol-Version`
- `params._meta["io.modelcontextprotocol/protocolVersion"]`, `clientInfo`, and `clientCapabilities`
- `Mcp-Name` on `tools/call`

The body is JSON-RPC `2.0`. The response id must match the request id.

## Failures

A JSON-RPC `error`, a non-200, or a connection failure is a server failure. The runner reports it as `error` ([HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md)).

A tool result with `isError` is returned to the runner. The prompt continues ([HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md)).

An aborted request is rethrown, so a stop stays a stop ([HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md)).

Each success body is checked with Zod through `parseSchema`. A mismatch throws `SchemaValidationException`, and the runner reports `error`. Two concrete resources that share a domain and name fail the list the same way.

Tests pass `fetchImpl`. The default URL is `config.mcpServerUrl`.
