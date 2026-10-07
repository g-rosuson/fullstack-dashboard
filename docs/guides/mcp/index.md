# Express MCP client

How the backend answers a prompt against the private MCP server. Product behavior stays in the SRS. These pages say which layer realizes it.

Ticket: [TKT-MCP-002](../../tickets/mcp/tkt-mcp-002-express-client.md).

Requirements: [fr/mcp](../../specs/requirements/fr/mcp/index.md). Acceptance: [HTTP](../../specs/architecture/http/mcp/index.md) · [Client](../../specs/architecture/client/mcp/index.md).

A prompt is a step loop. Each step, the model sees the messages so far and picks the next tool or resource with its arguments, or it writes the answer. The user allows or refuses that exact call. The result, or the refusal, joins the messages, and the next step starts. The loop ends when the model writes the answer. A prompt with N steps costs N + 1 model calls.

## Layers

- [Config](./config.md) — OpenRouter, the MCP server URL, and the conversations collection
- [Transport](./transport.md) — JSON-RPC client for `POST /mcp`
- [Model gateway](./gateway.md) — one step: the next item with arguments, or the answer
- [Events](./events.md) — prompt events on the SSE stream
- [Persistence](./persistence.md) — conversations and finished turns
- [Runtime](./runtime.md) — the step loop, permission gate, stop, and failure
- [HTTP](./http.md) — routes, stream, and controllers
- [Tests](./tests.md) — unit and integration coverage
