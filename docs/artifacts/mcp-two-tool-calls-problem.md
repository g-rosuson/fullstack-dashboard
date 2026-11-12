# Multiple function calls on one step

A prompt about an FPL team failed on 2026-11-09 and succeeded the next day. The gateway now asks permission for every usable call in that response before the next model request.

Record of the failure: [two tool calls](../guides/mcp/two-tool-calls.md). The step loop is [runtime](../guides/mcp/runtime.md). The gateway is [gateway](../guides/mcp/gateway.md).

## What failed

OpenRouter returned HTTP 200 for `deepseek/deepseek-v4.1-flash-20260910` on StreamLake (`gen-1794253045-3quhRyusj4BZAaO73RTN`). `finish_reason` was `tool_calls`. The body was one JSON document. `interpret` saw `tool__fpl__fpl_my_team` and `tool__fpl__fpl_gameweek`, then threw `Model provider returned more than one function call`.

That throw is `ExternalServiceException` with message `Model provider request failed` (502). The runner ends the prompt with `error` before `permission`, so the chat shows no Allow or Deny.

The request sets `parallel_tool_calls: false` and `tool_choice: 'auto'`. The system line says "Call at most one function." This model returned two calls anyway. `parallel_tool_calls` is a hint.

`fpl_my_team` (squad, bank, chips) and `fpl_gameweek` (current and next gameweek) are both reasonable for that prompt. The FPL catalog is behaving as specified. The step loop already runs one tool, then asks the model again.

## What it does now

`interpret` returns every call that is in the catalog and whose arguments match the schema, in the order the provider returned them. The runner asks permission for each one. Allow runs it. Refuse records the refusal. The next model request follows the last call in that response, and that request sees every result and refusal.

A call outside the catalog, or with arguments that do not match, is left out. The step fails when none of the calls can be asked.

`parallel_tool_calls: false` and the system line stay as hints ([FR-MCP-SEL-012](../specs/requirements/fr/mcp/selection.md), [HTTP-MCP-SEL-007](../specs/architecture/http/mcp/selection.md)).

## Logs

`Logger` JSON-stringifies `meta.error`. `ExternalServiceException.toJSON` copies `context.error`, a plain `Error`. `message` is not enumerable, so the log stores `{}`. `failureContext` reads `cause.message` for the stream, so the client can show the real sentence while the Docker log shows only `Model provider request failed`.

Serialize nested errors as `{ name, message }` in `BaseException.toJSON` or in `Logger`.
