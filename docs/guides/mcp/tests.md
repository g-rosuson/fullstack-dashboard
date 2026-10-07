# Tests

[TKT-MCP-002](../../tickets/mcp/tkt-mcp-002-express-client.md) is done when the acceptance scenarios in its definition of done hold. Tests cite the HTTP id in the `describe` name.

## Unit

Vitest, next to the code they cover.

- `backend/src/aop/mcp/client/client.test.ts` — request envelope and response parsing
- `backend/src/aop/mcp/gateway/gateway.test.ts` — one step, arguments, and provider failure
- `backend/src/aop/mcp/runner/runner.test.ts` — the step loop through `createPromptRunner`: permission with arguments, later arguments built from earlier results, refuse-then-continue, stop, unknown and duplicate turn ids, and a save that fails
- `backend/src/modules/mcp/tests/` — stream controller with `openSSE` / `sendSSE` mocked, and middleware body validation
- `backend/src/aop/db/mongo/repository/conversations/index.test.ts` — the conversation store

`PromptRunner.getInstance` takes no test arguments.

## Integration

`backend/test/integration/mcp/mcp.integration.test.ts` uses `backend/test/integration/harness.ts` and an SSE reader. It covers `PRG-001` through `PRG-009`, `SEL-001` through `SEL-006`, `ORD-001`, `FLR-001` through `FLR-003`, `REC-001` through `REC-003`, `ARG-001` and `ARG-002`, `CTX-001` through `CTX-003`, `STP-001` and `STP-002`, `OWN-001` and `OWN-002`, and `CNV-001` through `CNV-006`.

The client and the gateway take `fetchImpl`. The suite points the MCP server and OpenRouter at stub servers under `backend/test/integration/mcp/remote/` and `backend/test/integration/mcp/sse/`.

`HTTP-MCP-CTX-003` rejects a missing or duplicate `turnId` with `422` before the conversation is reserved. `HTTP-MCP-FLR-003` emits `error` when the finished answer cannot be kept, and the conversation read still has the turns it had.

## Exposure

`HTTP-MCP-EXP-001` through `HTTP-MCP-EXP-003` stay in `tests/mcp/exposure.test.mjs` under [TKT-MCP-001](../../tickets/mcp/tkt-mcp-001-private-network.md). That suite is separate from the Express client tests.
