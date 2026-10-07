---
name: Express MCP Client
overview: "Implement TKT-MCP-002: a backend MCP client plus a prompt runtime that calls the model and the private mcp-server, streams every step over SSE, runs a step loop where the model picks one tool/resource with its arguments and the user allows or refuses that exact call, and saves finished turns. Work is split into 8 blocks, with doc/spec gaps flagged inline where they block a decision."
todos:
  - id: config
    content: "Section 1: add OpenRouter, MCP server URL, and conversations collection config plus env entries"
    status: completed
  - id: transport
    content: "Section 2: build the aop/mcp/client transport over POST /mcp with the 2026-07-28 envelope and abort support"
    status: completed
  - id: model
    content: "Section 3: build the aop/mcp/gateway OpenRouter gateway with one step call that returns the next tool/resource with arguments, or the answer"
    status: completed
  - id: events
    content: "Section 4: define MCP event constants, Zod schemas, and the MCP event map. userId stays on the payload; no wire mapper"
    status: completed
  - id: persistence
    content: "Section 5: add the conversations repository, document schema, and DbContext wiring"
    status: completed
  - id: runtime
    content: "Section 6: build the prompt runner, step loop, permission gate, stop, and failure paths"
    status: completed
  - id: http
    content: "Section 7: add the modules/mcp routes, SSE stream, prompt/permit/refuse/stop controllers, middleware, and OpenAPI registry"
    status: completed
  - id: tests
    content: "Section 8: add unit and integration tests covering the ticket's acceptance scenarios"
    status: completed
isProject: false
---

# Express MCP client implementation plan

Ticket: [docs/tickets/mcp/tkt-mcp-002-express-client.md](docs/tickets/mcp/tkt-mcp-002-express-client.md) · branch `feat/tkt-mcp-002-express-client`

The MCP server already exists and runs on the `private` Compose network ([mcp-backend](mcp-backend), service `mcp-server`), stateless JSON over `POST /mcp`, protocol `2026-07-28`. The transport client in `backend/src/aop/mcp/client/` is done. Everything else below is new backend work.

The prompt runs as a step loop, the way Claude Code and Cursor run tools. Each step, the model sees everything so far and picks the next tool or resource with its arguments. The user allows or refuses that exact call. Its result, or the refusal, joins the messages, and the next step starts. The loop ends when the model writes the answer. A prompt with N steps costs N + 1 model calls.

## Flow

```mermaid
sequenceDiagram
    participant UI as Browser
    participant API as Express routes
    participant RUN as Prompt runner
    participant MCP as mcp-server
    participant LLM as OpenRouter
    participant DB as MongoDB

    UI->>API: 1. GET /api/mcp/stream, Bearer token
    UI->>API: 2a. POST /api/mcp/conversations
    API-->>UI: 2b. conversationId
    UI->>API: 3a. POST /api/mcp/prompt
    API-->>UI: 3b. 200 with promptId
    API->>RUN: 3c. start detached run
    RUN->>DB: 4. read chosen or all finished turns
    RUN-->>UI: 5a. SSE selecting
    RUN->>MCP: 5b. fetch list with schemas and URIs
    loop 6. one step at a time
        RUN->>LLM: 6a. messages so far + list
        LLM-->>RUN: 6b. next item with arguments, or answer text
        RUN-->>UI: 6c. SSE permission with arguments
        UI->>API: 6d. permit / refuse / stop
        RUN-->>UI: 6e. SSE call refused, refusal joins messages
        RUN-->>UI: 7a. SSE call processing
        RUN->>MCP: 7b. tools/call or resources/read
        MCP-->>RUN: 7c. result or failure
        RUN-->>UI: 7d. SSE call succeeded / failed, result joins messages
    end
    RUN-->>UI: 8. SSE answering, when a step returns answer text
    RUN->>DB: 9a. save turn
    RUN-->>UI: 9b. SSE answer
    RUN-->>UI: 10. SSE error, conversation unchanged
    RUN-->>UI: 11. SSE stopped, conversation unchanged
```



Step to section map:

- 1, 2, 3, 6d: Section 7 (HTTP surface)
- 5b, 7b: Section 2 (MCP transport)
- 4, 9a: Section 5 (persistence)
- 6a, 6b: Section 3 (model gateway)
- 5a, 6c, 6e, 7a, 7d, 8, 9b, 10, 11: Section 4 (event contract) + Section 6 (runtime)
- 6, 7: Section 6 (runtime)
- 10, 11: Section 6 (failure and stop paths)

## Section 1 — Config and environment

- [backend/src/config/schemas/index.ts](backend/src/config/schemas/index.ts): add `openRouterApiKeySchema`, `openRouterModelSchema`, `mcpServerUrlSchema`, `mongoMcpConversationsCollectionNameSchema`.
- [backend/src/config/utils/validate-common.ts](backend/src/config/utils/validate-common.ts): parse each with `parseSchema` and return them, matching the existing fail-fast style.
- [backend/src/aop/db/mongo/config/index.ts](backend/src/aop/db/mongo/config/index.ts): add an `mcpConversations` collection entry with `indexKeys: { userId: 1 }`, `unique: false`.
- `backend/.env.dev` and `backend/.env.prod`: add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `MCP_SERVER_URL=http://mcp-server:3000/mcp`, `MONGO_MCP_CONVERSATIONS_COLLECTION_NAME`.

Gaps (Resolved):

- Resolved: the model provider is OpenRouter. `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are required, present in the backend env files, and read as `config.openRouterApiKey` and `config.openRouterModel`.

- Resolved: `MCP_SERVER_URL` and `MONGO_MCP_CONVERSATIONS_COLLECTION_NAME` are required and present in the backend env files. Config is fail-fast at import, so the backend will not boot without them.
- [tests/mcp/compose.override.yml](tests/mcp/compose.override.yml) deliberately clears the backend `env_file`. The exposure test's `compose run backend` only works because it overrides the entrypoint with `node -e` and never imports `config`. Worth re-running `npm run test:mcp` after Section 1 to confirm.
- Resolved: the MCP server address is `MCP_SERVER_URL` (dev and prod: `http://mcp-server:3000/mcp`), not a constant. [exposure.md](docs/specs/architecture/http/mcp/exposure.md) still describes that address.

## Section 2 — MCP transport client (steps 5b, 7b)

`backend/src/aop/mcp/client/`. No SDK needed: the server is stateless JSON, so plain `fetch` is enough. Copy the exact envelope the exposure test already proves works — see [tests/mcp/exposure.test.mjs](tests/mcp/exposure.test.mjs) lines 50-68: `Mcp-Method` and `MCP-Protocol-Version` headers plus `params._meta["io.modelcontextprotocol/protocolVersion"]`, `clientInfo`, `clientCapabilities`.

- Methods: `listTools`, `listResources`, `listResourceTemplates`, `callTool`, `readResource`. Every method takes an `AbortSignal` so stop can cancel in-flight work (FR-MCP-STP-004).
- Validate each response with Zod through `parseSchema`; failure throws `SchemaValidationException`.
- Domain for each item comes from `_meta.domain` (see [mcp-backend/src/modules/whatsapp/index.ts](mcp-backend/src/modules/whatsapp/index.ts)). Keep a `{ domain, name } -> uri` map built from `resources/list` so a selected resource resolves to a URI for `resources/read`.
- A resource template is read by expanding its URI template with the arguments the model filled for that step (HTTP-MCP-ARG-001, HTTP-MCP-ARG-002).
- A JSON-RPC `error` response, a non-200, or a connection failure is a server failure, surfaced to the runner for the `error` event (HTTP-MCP-FLR-002).
- The client doc comments say "catalog"; update them to "list" to match the specs.

## Section 3 — Model gateway (steps 6a, 6b)

`backend/src/aop/mcp/gateway/`, class `ModelGateway`. One kind of model call, the step, sent to the OpenRouter chat completions endpoint with `config.openRouterApiKey` and `config.openRouterModel`.

Path: `gateway`, not `model`. `client` is named for its role. `model` would name the remote system and read as a domain model beside the transport client.

- Input: the messages so far (context turns, the prompt, earlier results and refusals) + the MCP list as `tools`. Each tool, resource, and resource template becomes one function, since function calling only knows tools. A tool's function takes its input schema; a template's function takes its URI template variables; a concrete resource's function takes no arguments.
- `parallel_tool_calls: false`, so each step returns at most one item (HTTP-MCP-SEL-002).
- Output: a `tool_calls` entry is the next tool or resource with its arguments; plain `content` is the answer text (FR-MCP-SEL-001, FR-MCP-SEL-011, HTTP-MCP-ARG-001).
- Arguments are checked against that item's input schema or URI template. An item outside the list counts as malformed output.
- Function names map back to `{ domain, name, kind }` through a lookup built with the list.
- The gateway takes `fetchImpl`, like the MCP client, so tests can pass a fake.
- Messages use the record shape `{ role: "user" | "assistant" | "tool" | "resource", content: string }`. `tool` and `resource` are sent as user messages labeled `Tool result` and `Resource result`, because the provider accepts a `tool` role only after an assistant `tool_calls` entry, and the record does not keep a call id.
- The step returns `{ type: "selection", domain, name, kind, arguments }` or `{ type: "answer", content }`. `kind` is `"tool"` or `"resource"`. A resource template is `kind: "resource"`. A list that repeats `{ kind, domain, name }`, including a concrete resource and a template with the same domain and name, is rejected before the call.
- A non-200, malformed output, or network failure throws `ExternalServiceException` (`MODEL_PROVIDER_REQUEST_FAILED`). An aborted request is rethrown.

Every call passes the run's `AbortSignal`. Any non-200, malformed output, or network failure ends the prompt as a provider failure.

Gaps (Resolved):

- Resolved: the provider is OpenRouter, using the Section 1 config.
- Resolved: the folder is `backend/src/aop/mcp/gateway/`, class `ModelGateway`.

## Section 4 — Event contract (steps 5a, 6c, 6e, 7a, 7d, 8, 9b, 10, 11)

The emitter validates every event against an exhaustive schema map. MCP prompt events are registered in three places: the `mcp` constants, `McpEventTypeToPayloadMap`, and the emitter's `eventSchemas`.

- [backend/src/shared/constants/events/index.ts](backend/src/shared/constants/events/index.ts): an `mcp` group whose values are the exact wire `type` strings from [prompt.md](docs/specs/architecture/http/mcp/prompt.md): `selecting`, `permission`, `call`, `answering`, `answer`, `error`, `stopped`.
- [backend/src/shared/schemas/mcp/events/](backend/src/shared/schemas/mcp/events/index.ts) and [backend/src/shared/types/mcp/events/](backend/src/shared/types/mcp/events/index.ts): one Zod schema per event, and `McpEventTypeToPayloadMap`.
  - Every event carries `type`, `promptId`, and `userId`.
  - `permission` carries `domain`, `name`, `kind`, `arguments`.
  - `call` carries `status`, `domain`, `name`, `kind`, and `arguments`. `result` is present only when `status` is `succeeded`: a tool result is `{ content, isError? }`, a resource result is `{ contents }`.
  - `answer` carries `content`, `startedAt`, `finishedAt`, `domains`, `list`, `messages`. `domains` is `{ name, tools: { name }[], resources: { name }[] }[]`. `list.tools` carry `argumentFields` (`name`, `type`, `required`). `list.resources` carry `uri`, or `uriTemplate` when the URI depends on the prompt.
  - `error` carries `context`, `messages`, and `list` when the model asked for it. `stopped` carries `messages`, and `list` when the model asked for it.
- The emitter intersects the jobs map and `McpEventTypeToPayloadMap`. `eventSchemas` in [backend/src/aop/emitter/schemas/index.ts](backend/src/aop/emitter/schemas/index.ts) has one schema per key of that intersection. `sendSSE` serializes that same object.

Gaps (Resolved):

- Resolved: jobs keeps `EventTypeToPayloadMap` in [backend/src/shared/types/jobs/events/types-jobs-events.ts](backend/src/shared/types/jobs/events/types-jobs-events.ts). MCP prompt events are `McpEventTypeToPayloadMap` in `shared/types/mcp/events/`. Conversation create, list, read, and delete stay request/response JSON; they are not emitter events. The emitter is the one place the two maps meet. The `type` strings do not overlap (`job-finished` versus `selecting`), so each key has one payload.
- Resolved: `userId` is not stripped before `sendSSE`. The access token's `id` claim is that same user id, and the frontend already decodes it into the session. The jobs stream already sends `userId`. The listener still filters with `event.userId === req.context.user.id` before the write, so another user's id is not sent on this connection. There is no wire mapper.

## Section 5 — Persistence (steps 4, 9a)

- New repository `ConversationRepository` in [backend/src/aop/db/mongo/repository/conversations/](backend/src/aop/db/mongo/repository/conversations/index.ts) plus a Zod document schema, following the `database-query-patterns` skill: `parseSchema` on every read, `SchemaValidationException` on mismatch.
- Document shape: `{ _id, userId, turns: [{ turnId, prompt, answer, savedAt }] }`.
- Methods: `create`, `listForUser`, `getByIdForUser`, `deleteForUser`, `appendTurn`.
- Register it on `DbContext` ([backend/src/aop/db/mongo/context](backend/src/aop/db/mongo/context)) so controllers reach it via `req.context.db.repository.conversations`. The runner builds its own context the way `Delegator.dbContext()` does, since it runs after the HTTP response.
- Only a finished answer becomes a turn (HTTP-MCP-CNV-004). After `stopped` or `error`, the conversation keeps the turns it had (HTTP-MCP-CNV-005). Callers do that by appending only for a finished answer.

Gaps (Resolved):

- Resolved: create, list, read, and delete stay in TKT-MCP-002. `HTTP-MCP-PRG-007` needs a `conversationId` from `HTTP-MCP-CNV-001`, `HTTP-MCP-OWN-002` needs the same 404 for a missing or other-user conversation, and `HTTP-MCP-CTX-001/002` read finished turns on that conversation. The HTTP routes for those four calls are still Section 7; this section is the store they and the runner share. A missing id and another user's id are the same `ResourceNotFoundException`.

## Section 6 — Prompt runtime (steps 3c, 4 through 11)

`PromptRunner` in [backend/src/aop/mcp/runner/](backend/src/aop/mcp/runner/index.ts), a singleton modelled on [backend/src/aop/delegator/index.ts](backend/src/aop/delegator/index.ts). `getInstance` uses the real client, gateway, and conversation store. Tests call `createPromptRunner` with fakes. The class is `PromptRunner` and one entry is `PromptRun`. `selecting` covers the list fetch and each model step.

State:

- `activePrompts: Map<promptId, PromptRun>` where a run holds `userId`, `conversationId`, `phase`, `startedAt`, `aborter`, `messages`, `list`, and `pendingPermission`.
- `activePromptByConversation: Map<conversationId, promptId>` while that prompt is being answered, including a permission wait (HTTP-MCP-PRG-008, FR-MCP-CNV-004).
- `finishedPrompts`, capped at 200, keeps `{ userId }` after the prompt leaves "being answered".

`phase` while being answered: `selecting | awaitingPermission | calling | answering`. After the last event: `answered | stopped | failed`.

`start` loads the conversation, checks turn ids, and reserves the conversation before it returns. The step loop is scheduled with `setImmediate`, so the HTTP 200 is written before the first event. `permit`, `refuse`, and `stop` are synchronous. `stop` claims the terminal phase and aborts before it returns. The loop emits `stopped` after that.

Orchestration:

1. Load context turns (`turnIds` or all finished turns) and seed `messages` oldest first, each old prompt as `user` and its answer as `assistant`, then the new prompt as `user` (HTTP-MCP-CTX-001/002). An unknown or duplicate `turnId` throws `BusinessLogicException` before the reserve.
2. Emit `selecting`, fetch the MCP list (tools, resources, resource templates) once, and keep it as `list` (HTTP-MCP-PRG-002).
3. Run steps one at a time, with no step cap (HTTP-MCP-ORD-001, HTTP-MCP-SEL-002). Each step calls the model with `messages` and `list`.
4. When the step returns an item: emit `permission` with its `arguments` and park on a deferred promise with no timer (HTTP-MCP-SEL-001, HTTP-MCP-SEL-006, NFR-REL-MCP-001).
5. On permit: emit `call` `processing` with the same `arguments`, invoke the MCP server with the abort signal, then emit `succeeded` with `result` or `failed` when the tool sets `isError`. Append the outcome to `messages` with role `tool` or `resource`, and start the next step. A tool failure also starts the next step (HTTP-MCP-FLR-001). A provider or server exception does not emit `failed`.
6. On refuse: emit `call` `refused` with the same `arguments`, append a `tool` or `resource` message saying the user refused it, and start the next step (HTTP-MCP-SEL-005, HTTP-MCP-REC-003). A refusal is not listed in `domains`.
7. When the step returns answer text: append the turn, then emit `answering` and `answer` with `content`, `startedAt`, `finishedAt`, `domains` for each tool or resource that ran once, `list`, and `messages`. A failed save emits `error` and does not emit `answer`.
8. Provider or server failure: emit `error` with a non-empty `context`, `messages`, and `list` when the list was fetched. `error` is the last event for that prompt. The busy index is cleared.
9. Stop: abort the signal and emit a single `stopped` with `messages`, and `list` when the list was fetched. `stopped` is the last event for that prompt (HTTP-MCP-STP-001). No later `call`.

Section 7 calls `PromptRunner.getInstance()`: `start`, `permit`, `refuse`, `stop`, and `getOpenPermissionsForUser` for the stream replay (HTTP-MCP-PRG-009). Those methods throw the 404 and 422. Middleware only validates the body.

Gaps (Resolved):

- Resolved: finished prompts stay in a process-local map of `{ userId }`, capped at 200. This user's finished prompt returns 422 for stop (HTTP-MCP-STP-002) and for permit or refuse (HTTP-MCP-SEL-004). An unknown id, another user's id, or an id the cap has dropped returns 404 (HTTP-MCP-OWN-001). Nothing is persisted. After a restart the id is unknown.
- Resolved: an invalid `turnId` returns 422 `BUSINESS_LOGIC_ERROR` from `start`, before the 200 and before the conversation is reserved. The HTTP spec still has no scenario for that response.
- Resolved: the step loop is unbounded. Every selection waits on a permission ask.
- Resolved: `Aborter` lives at [backend/src/aop/aborter/index.ts](backend/src/aop/aborter/index.ts). Delegator and PromptRunner both use it.

## Section 7 — HTTP surface (steps 1, 2, 3, 6d)

New module `backend/src/modules/mcp/` following the structure in [backend/.agents/rules/architecture.mdc](backend/.agents/rules/architecture.mdc): `mcp-routing.ts`, `mcp-controller.ts`, `mcp-middleware.ts`, `mcp-registry.ts`, plus `schemas/`, `types/`, `mappers/`.

- [backend/src/shared/constants/routes/index.ts](backend/src/shared/constants/routes/index.ts): add an `mcp` group under `/api/mcp` for `stream`, the four conversation routes, `prompt`, `prompt/:id/permit`, `prompt/:id/refuse`, `prompt/:id/stop`.
- [backend/src/server/index.ts](backend/src/server/index.ts): mount `mcpRoutes` after `http.context.middleware.authenticate` and before `exceptionsMiddleware()`, alongside `jobsRoutes`.
- `streamMcp`: `openSSE(res)`, replay an open `permission` for each of this user's active prompts, register one listener per MCP event type filtered by `event.userId === req.context.user.id`, and tear every listener down in `req.on('close', ...)`. Follow the `sse-streaming` skill and the `streamJobs` precedent.
- Mutating controllers respond with the inline envelope used elsewhere: `{ success: true, data: { promptId }, meta: { timestamp: new Date().toISOString() } }`.
- `mcp-middleware.ts`: body validation through `validateRequestPayload`. The prompt body is `conversationId`, `prompt`, and optional `turnIds`. The permit and refuse body is `{ domain, name, kind }`. A busy conversation, and a permit or refuse with no pending ask or a body that differs from it, throw `BusinessLogicException` (422, `BUSINESS_LOGIC_ERROR`, HTTP-MCP-SEL-004). Unknown or other-user prompt and conversation ids throw `ResourceNotFoundException` (404).
- `mcp-registry.ts` registered in [backend/src/services/openapi/generate-spec.ts](backend/src/services/openapi/generate-spec.ts).

Gaps (Resolved):

- Resolved: the stream sends prompt events only, so `streamMcp` stays synchronous as the `sse-streaming` skill requires.

## Section 8 — Tests

- Unit (vitest) in `backend/src/modules/mcp/tests/` and alongside `aop/mcp/**`: the request envelope and response parsing for the transport client, the runner state machine (step loop, permission gate with arguments, later arguments built from earlier results, refuse-then-continue, stop), and the stream controller with `openSSE`/`sendSSE` mocked the way [backend/src/modules/jobs/tests/jobs-controller-stream-jobs.test.ts](backend/src/modules/jobs/tests/jobs-controller-stream-jobs.test.ts) does.
- Integration in `backend/test/integration/mcp/`, using [backend/test/integration/harness.ts](backend/test/integration/harness.ts) and the SSE reader at [backend/test/integration/jobs/sse/index.ts](backend/test/integration/jobs/sse/index.ts). Cover the ticket's definition of done: `PRG-001` to `PRG-009`, `SEL-001` to `SEL-006`, `ORD-001`, `FLR-001/002`, `REC-001` to `REC-003`, `ARG-001/002`, `CTX-001/002`, `STP-001/002`, `OWN-001`.
- `EXP-001` to `EXP-003` are already covered by [tests/mcp/exposure.test.mjs](tests/mcp/exposure.test.mjs) under TKT-MCP-001; leave that suite alone apart from re-running it after Section 1.

The runner state machine is covered by [backend/src/aop/mcp/runner/runner.test.ts](backend/src/aop/mcp/runner/runner.test.ts) through `createPromptRunner`. `getInstance` stays free of test arguments. Integration tests for the HTTP surface are still this section. They can keep using that factory, or point `MCP_SERVER_URL` and the OpenRouter URL at stub servers. The client and the gateway already take `fetchImpl`.