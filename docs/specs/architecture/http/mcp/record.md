# HTTP — MCP record

Fields on the prompt stream ([HTTP-MCP-PRG-001](./prompt.md)). Full value shapes live in OpenAPI / Zod.

## HTTP-MCP-REC-001 — Arguments

On a `permission` event, and on every `call` event:

- `arguments` is present
- The model filled them before the ask ([HTTP-MCP-ARG-001](./arguments.md))
- A `call` carries the same `arguments` as its `permission` event

Traces:

- [FR-MCP-REC-001](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-REC-002 — Result

On a `call` event with `status` `"succeeded"`:

- `result` is present

Traces:

- [FR-MCP-REC-002](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-REC-003 — Messages and domains

On the `answer` event:

- `messages`: `{ role: "user" | "assistant" | "tool" | "resource", content: string }[]`, in the order those parts were passed to the model
- A conversation turn uses `user` or `assistant`. A tool result uses `tool`. A resource read uses `resource`
- A refused tool uses `tool`, and a refused resource uses `resource`, with content saying the user refused it
- `list`: the tools and resources the model asked for ([HTTP-MCP-ARG-002](./arguments.md)).
- `domains`: `{ name: string, tools: { name: string }[], resources: { name: string }[] }[]`, listing each tool and resource that was used once, under its domain

On `error` and `stopped`:

- `messages`: conversation turns, tool results, resource reads, and refusals already passed to the model (may be empty)
- `list`: present when the model asked for the list. Absent when it did not.

Traces:

- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)
- [FR-MCP-PRG-007](../../../requirements/fr/mcp/progress.md)
