# HTTP — MCP available tools and resources

Sent on the stream opened by [HTTP-MCP-PRG-001](./prompt.md), before the user starts a prompt.

## HTTP-MCP-AVL-001 — Catalog on connect

After the stream opens, and before any prompt event (`selecting`, `permission`, `call`, `answering`, `answer`, `error`, `stopped`):

- Event: `type` `"catalog"`
- `domains`: `{ name: string, tools: { name: string }[], resources: { name: string }[] }[]`
- `domains` may be empty
- Each tool and each resource the user can choose appears once, under its domain

Traces:

- [FR-MCP-AVL-001](../../../requirements/fr/mcp/available.md)

## HTTP-MCP-AVL-002 — Tool or resource not in the catalog

- Request: [HTTP-MCP-PRG-007](./prompt.md) with a `tools` or `resources` entry whose `domain` and `name` are not in the `catalog` event
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`

Traces:

- [FR-MCP-AVL-002](../../../requirements/fr/mcp/available.md)
