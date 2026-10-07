# HTTP — MCP arguments

The model asks for the list of tools and resources ([HTTP-MCP-PRG-002](./prompt.md)). Then, one step at a time, it selects the next tool or resource from that list and fills its arguments. The `permission` event carries those arguments, so the user sees them before allowing ([HTTP-MCP-SEL-001](./selection.md)).

## HTTP-MCP-ARG-001 — Model fills arguments before the ask

On each `permission` event:

- `arguments` is present
- The model filled them from the messages so far: the turns, the prompt, and the results of tools and resources that ran before it in that prompt
- The matching `call` for that tool or resource carries the same `arguments`

Traces:

- [FR-MCP-REC-001](../../../requirements/fr/mcp/record.md)
- [FR-MCP-SEL-010](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-011](../../../requirements/fr/mcp/selection.md)

## HTTP-MCP-ARG-002 — Model asks for the list

During `selecting` ([HTTP-MCP-PRG-002](./prompt.md)), the model asks for the list of tools and resources from the MCP server. Each step selects from that list.

The list includes, for each tool or resource:

- Domain and name
- A tool's argument fields: each field's name and type, and which fields are required
- A resource's URI, or its URI template when the URI depends on the prompt

On `answer`, `error`, and `stopped`, this list is `list` ([HTTP-MCP-REC-003](./record.md)).

Traces:

- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-004](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)
