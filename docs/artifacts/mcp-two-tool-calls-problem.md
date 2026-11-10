# Multiple function calls on one step

A prompt about an FPL team failed on 2026-11-09 and succeeded the next day. The gateway still rejects a completion with more than one function call. A later run succeeds when the model returns one call.

Record of the failure: [two tool calls](../guides/mcp/two-tool-calls.md). The step loop is [runtime](../guides/mcp/runtime.md). The gateway is [gateway](../guides/mcp/gateway.md).

## What failed

OpenRouter returned HTTP 200 for `deepseek/deepseek-v4.1-flash-20260910` on StreamLake (`gen-1794253045-3quhRyusj4BZAaO73RTN`). `finish_reason` was `tool_calls`. The body was one JSON document. `interpret` saw `tool__fpl__fpl_my_team` and `tool__fpl__fpl_gameweek`, then threw `Model provider returned more than one function call`.

That throw is `ExternalServiceException` with message `Model provider request failed` (502). The runner ends the prompt with `error` before `permission`, so the chat shows no Allow or Deny.

The request sets `parallel_tool_calls: false` and `tool_choice: 'auto'`. The system line says "Call at most one function." This model returned two calls anyway. `parallel_tool_calls` is a hint.

`fpl_my_team` (squad, bank, chips) and `fpl_gameweek` (current and next gameweek) are both reasonable for that prompt. The FPL catalog is behaving as specified. The step loop already runs one tool, then asks the model again.

## Why a later prompt succeeds

`ModelGateway.interpret` still throws when `calls.length > 1`. `gateway.test.ts` still expects that throw. The gateway has done this since the file was added. Sampling decides the outcome: one call reaches permission, two calls end the prompt.

The failure guide describes an edit that keeps the first call and drops the rest. That edit is not in `backend/src/aop/mcp/gateway/index.ts`.

## Proposed change

In `interpret`, keep the first call that is in the catalog and whose arguments match the schema. Return that selection. The runner emits `permission` and waits. The tool runs after permit. Log the dropped names at warning level. After the tool runs or is refused, the next step can select the other tool.

When the first call is unknown or its arguments fail the schema, take the next call that passes. Fail the step when every call fails those checks.

Keep `parallel_tool_calls: false` and the system line as hints. State in `step` and in the gateway guide that the gateway reduces the completion to one selection.

Replace the test `rejects more than one function call` with one that resolves to the first valid selection and does not call the provider again.

Leave both tools uncalled in that step. A second completion spends another request on a model that already ignored the instruction.

## Logs

`Logger` JSON-stringifies `meta.error`. `ExternalServiceException.toJSON` copies `context.error`, a plain `Error`. `message` is not enumerable, so the log stores `{}`. `failureContext` reads `cause.message` for the stream, so the client can show the real sentence while the Docker log shows only `Model provider request failed`.

Serialize nested errors as `{ name, message }` in `BaseException.toJSON` or in `Logger`.
