# mcp-server

Stateless MCP 2026-07-28 Streamable HTTP server on Bun and Hono. This process is a protocol router: it validates the wire protocol, delegates to enrolled domain modules, and returns JSON. It does not authenticate callers and does not ship a domain module yet.

Caller login is the consumer's job (Cursor, a backend, a gateway). This process only enforces Host/Origin allowlists.

## Run

```bash
bun install
cp .env.example .env
bun run dev
```

Production:

```bash
bun run start
```

Typecheck and tests:

```bash
bun run typecheck
bun test
```

## Docker

```bash
docker compose up --build
```

Compose binds `HOST=0.0.0.0` and sets `MCP_ALLOWED_HOSTS=localhost,127.0.0.1`. Add a public hostname to that list before serving beyond loopback.

## Sentry

Optional. Leave `SENTRY_DSN` unset or empty and the process starts without Sentry. Set a DSN to enable error reporting and traces (`SENTRY_TRACES_SAMPLE_RATE`, default `0.1`). `SENTRY_ENVIRONMENT` defaults to `production`. `SENTRY_RELEASE` defaults to the `package.json` version.

## Enroll a module

See [`src/modules/README.md`](src/modules/README.md). Add a folder that implements `DomainModule`, then append it to the array in `src/modules/index.ts`. Domain secrets stay in that module's own env — do not add them to the platform schema.

A later FPL module uses the operator credentials documented in [`src/docs/fpl-authentication.md`](src/docs/fpl-authentication.md).

## Sample `tools/list`

```bash
curl -sS -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/list' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { "name": "curl", "version": "0.0.0" },
        "io.modelcontextprotocol/clientCapabilities": {}
      }
    }
  }'
```

`GET` and `DELETE` `/mcp` return `405` with `Allow: POST`.

## Cursor

Point Cursor at the running HTTP endpoint in `.cursor/mcp.json` or `~/.cursor/mcp.json`. Cursor is the client here; env for this process lives in `.env` or Compose, not in `mcp.json`.

```json
{
    "mcpServers": {
        "mcp-server": {
            "url": "http://127.0.0.1:3000/mcp"
        }
    }
}
```

If you later launch this process from Cursor over stdio instead, put platform env in that server's `env` block.
