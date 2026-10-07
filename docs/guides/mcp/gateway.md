# Model gateway

`ModelGateway` in `backend/src/aop/mcp/gateway/` runs one step of a prompt. The runner hands it the messages so far and the MCP list. It asks OpenRouter what to do next.

The folder is `gateway`. `client` names the MCP transport. Naming this folder `model` would read as a domain model beside that client.

The in-folder narrative is [backend/src/aop/mcp/gateway/README.md](../../../backend/src/aop/mcp/gateway/README.md). This page is the trace to the SRS.

## What goes in

Messages are `{ role: "user" | "assistant" | "tool" | "resource", content: string }`, oldest first: context turns, the prompt, earlier results, and refusals ([FR-MCP-REC-003](../../specs/requirements/fr/mcp/record.md)).

`tool` and `resource` are sent to the provider as user messages labeled `Tool result` and `Resource result`. The provider accepts a `tool` role only after an assistant `tool_calls` entry, and the record does not keep a call id.

The list is tools, concrete resources, and resource templates. Each item becomes one function, because function calling only knows tools.

- A tool uses its input schema.
- A resource template uses its URI template variables.
- A concrete resource takes no arguments.

The request sets `parallel_tool_calls: false`, so a step returns at most one item ([HTTP-MCP-SEL-002](../../specs/architecture/http/mcp/selection.md)).

The API key and model are `config.openRouterApiKey` and `config.openRouterModel`. Tests pass `fetchImpl`.

## What comes back

A `tool_calls` entry is the next tool or resource with its arguments. Plain `content` is the answer text ([FR-MCP-SEL-001](../../specs/requirements/fr/mcp/selection.md), [FR-MCP-SEL-011](../../specs/requirements/fr/mcp/selection.md), [HTTP-MCP-ARG-001](../../specs/architecture/http/mcp/arguments.md)).

The step returns `{ type: "selection", domain, name, kind, arguments }` or `{ type: "answer", content }`. `kind` is `"tool"` or `"resource"`. A resource template is `kind: "resource"`.

Arguments are checked against that item’s input schema or URI template. A function outside the list is malformed output. Function names map back to `{ domain, name, kind }` through a lookup built with the list.

A list that repeats `{ kind, domain, name }` is rejected before the call. A concrete resource and a template share `kind: "resource"`, so they cannot share a domain and name either.

## When it fails

A non-200, malformed output, or a network failure throws `ExternalServiceException` (`MODEL_PROVIDER_REQUEST_FAILED`). The runner ends the prompt with `error` ([HTTP-MCP-FLR-002](../../specs/architecture/http/mcp/failure.md)).

An aborted request is rethrown ([FR-MCP-STP-004](../../specs/requirements/fr/mcp/stop.md)).
