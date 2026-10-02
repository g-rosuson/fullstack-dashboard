# HTTP acceptance

API-boundary scenarios that realize FRs and NFRs. Not requirements — see [requirements](../../requirements/README.md).

## Rules

- One file per capability (mirrors `docs/specs/requirements/fr/<domain>/`)
- Route once at the top of the file (or section)
- Each scenario: unique ID, linked FR(s) / NFR(s), then status + assertable body or header
- No “shall” language; do not restate domain intent
- No client scenarios — [client acceptance](../client/README.md)
- Pin fields tests assert. Do not require the rest of a JSON-RPC result (`resultType`, `ttlMs`, `cacheScope`, schema `$schema`)

## Identifiers

Pattern: `HTTP-<DOMAIN>-<CAPABILITY>-###`  
Examples: `HTTP-MCP-PRT-001`, `HTTP-ECHO-MSG-001`

Each capability has its own sequence. Never renumber. Retired IDs stay unused.

Tests and implementation cite the HTTP ID (and may also cite the FR or NFR). Every HTTP ID cites at least one FR or NFR.

## Modern MCP request

A request the success scenarios mean by “modern MCP request”:

- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`
- `MCP-Protocol-Version: 2026-07-28`
- `Mcp-Method` equal to the JSON-RPC `method`
- `Mcp-Name` equal to the tool name on `tools/call`
- No `Authorization` header and no session header
- Body:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method>",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { "name": "curl", "version": "0.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

`tools/call` adds `params.name` and `params.arguments` beside `_meta`.

Host must be on the allowlist. When an origin allowlist is in effect, either omit `Origin` or send an allowed origin host.

## Response shapes

Success and error bodies are JSON-RPC 2.0. A success result includes `result._meta["io.modelcontextprotocol/serverInfo"]` = `{ name: "mcp-server", version: <package.json version> }`.

A tool-argument failure is HTTP `200` with `result.isError: true`, not a JSON-RPC `error`.

Health bodies are `{ status: "ok" | "unavailable" }`.

An exception outside the MCP handler is [HTTP-ERR-INT-001](./error/unhandled.md). A failure inside the handler is not that body.

## Domain index

Each `http/<domain>/index.md` lists canonical routes and links to scenario files only. Do not repeat these rules there.

- [mcp/](./mcp/index.md) — `HTTP-MCP-*`
- [echo/](./echo/index.md) — `HTTP-ECHO-*`
- [health/](./health/index.md) — `HTTP-HEALTH-*`
- [error/](./error/index.md) — `HTTP-ERR-*`
