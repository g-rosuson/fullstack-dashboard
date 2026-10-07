# Runtime

`PromptRunner` in `backend/src/aop/mcp/runner/` is a singleton, modelled on the delegator. `getInstance` uses the real client, gateway, and conversation store. Tests call `createPromptRunner` with fakes. One in-flight prompt is a `PromptRun`.

`selecting` covers the list fetch and each model step.

## State

`activePrompts` maps `promptId` to a run: `userId`, `conversationId`, `phase`, `startedAt`, `aborter`, `messages`, `list`, and `pendingPermission`.

`activePromptByConversation` maps `conversationId` to `promptId` while that prompt is being answered, including a permission wait ([HTTP-MCP-PRG-008](../../specs/architecture/http/mcp/prompt.md), [FR-MCP-CNV-004](../../specs/requirements/fr/mcp/conversation.md)).

`finishedPrompts` keeps `{ userId }` after the prompt leaves “being answered”, capped at 200. This user’s finished prompt returns 422 for stop ([HTTP-MCP-STP-002](../../specs/architecture/http/mcp/stop.md)) and for permit or refuse ([HTTP-MCP-SEL-004](../../specs/architecture/http/mcp/selection.md)). An unknown id, another user’s id, or an id the cap has dropped returns 404 ([HTTP-MCP-OWN-001](../../specs/architecture/http/mcp/ownership.md)). Nothing about that id is persisted. After a restart the id is unknown.

`phase` while being answered: `selecting`, `awaitingPermission`, `calling`, `answering`. After the last event: `answered`, `stopped`, `failed`.

`start` loads the conversation, checks turn ids, and reserves the conversation before it returns. The step loop is scheduled with `setImmediate`, so the HTTP 200 is written before the first event. `permit`, `refuse`, and `stop` are synchronous. `stop` claims the terminal phase and aborts before it returns. The loop emits `stopped` after that. Both this runner and the delegator use `Aborter` in `backend/src/aop/aborter/`.

## Loop

1. Load context turns (`turnIds`, or every finished turn) and seed `messages` oldest first. Each old prompt is `user` and its answer is `assistant`, then the new prompt is `user` ([HTTP-MCP-CTX-001](../../specs/architecture/http/mcp/context.md), [HTTP-MCP-CTX-002](../../specs/architecture/http/mcp/context.md)). An unknown or duplicate `turnId` throws `BusinessLogicException` before the reserve and before the 200 ([HTTP-MCP-CTX-003](../../specs/architecture/http/mcp/context.md)).
2. Emit `selecting`, fetch the MCP list once, and keep it ([HTTP-MCP-PRG-002](../../specs/architecture/http/mcp/prompt.md)).
3. Run steps one at a time, with no step cap ([HTTP-MCP-ORD-001](../../specs/architecture/http/mcp/order.md), [HTTP-MCP-SEL-002](../../specs/architecture/http/mcp/selection.md)). Each step calls the model with `messages` and `list`.
4. When the step returns an item, emit `permission` with its `arguments` and wait on a deferred promise with no timer ([HTTP-MCP-SEL-001](../../specs/architecture/http/mcp/selection.md), [HTTP-MCP-SEL-006](../../specs/architecture/http/mcp/selection.md), [NFR-REL-MCP-001](../../specs/requirements/nfr/reliability/mcp.md)).
5. On permit, emit `call` `processing` with the same `arguments`, invoke the MCP server with the abort signal, then emit `succeeded` with `result` or `failed` when the tool sets `isError`. Append the outcome to `messages` with role `tool` or `resource`, and start the next step. A tool failure also starts the next step ([HTTP-MCP-FLR-001](../../specs/architecture/http/mcp/failure.md)). A provider or server exception does not emit `failed`.
6. On refuse, emit `call` `refused` with the same `arguments`, append a message saying the user refused it, and start the next step ([HTTP-MCP-SEL-005](../../specs/architecture/http/mcp/selection.md), [HTTP-MCP-REC-003](../../specs/architecture/http/mcp/record.md)). A refusal is absent from `domains`.
7. When the step returns answer text, append the turn, then emit `answering` and `answer` with `content`, `startedAt`, `finishedAt`, `domains` for each tool or resource that ran once, `list`, and `messages`. A failed save emits `error` and does not emit `answer` ([HTTP-MCP-FLR-003](../../specs/architecture/http/mcp/failure.md)).
8. A provider or server failure emits `error` with a non-empty `context`, `messages`, and `list` when the list was fetched. `error` is the last event for that prompt. The busy index is cleared ([HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md)).
9. Stop aborts the signal and emits a single `stopped` with `messages`, and `list` when the list was fetched. `stopped` is the last event for that prompt ([HTTP-MCP-STP-001](../../specs/architecture/http/mcp/stop.md)). No later `call`.

The HTTP layer calls `start`, `permit`, `refuse`, `stop`, and `getOpenPermissionsForUser` for the stream replay ([HTTP-MCP-PRG-009](../../specs/architecture/http/mcp/prompt.md)). Those methods throw the 404 and 422. Middleware only validates the body.
