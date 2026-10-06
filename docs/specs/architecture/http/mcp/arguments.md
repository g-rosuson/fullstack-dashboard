# HTTP — MCP arguments

How a prompt carries a tool or resource the user chose ([FR-MCP-AVL-001](../../../requirements/fr/mcp/available.md), [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)). The choice is sent on [HTTP-MCP-PRG-007](./prompt.md) as a domain and a name. The catalog on connect is that same domain and name ([HTTP-MCP-AVL-001](./available.md)). The model asks for the list, then fills arguments from it.

## HTTP-MCP-ARG-001 — Model fills arguments from the list

For each tool or resource the prompt uses, on its `call` with `status` `"processing"`:

- `arguments` are the values the model took from the prompt, using the list in [HTTP-MCP-ARG-002](#http-mcp-arg-002--model-asks-for-the-list)

Traces:

- [FR-MCP-ARG-001](../../../requirements/fr/mcp/arguments.md)
- [FR-MCP-REC-001](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-ARG-002 — Model asks for the list

During `selecting` ([HTTP-MCP-PRG-002](./prompt.md)), the model asks for the list of tools and resources from the MCP server. From that list it fills arguments for each tool or resource the user attached and each one it selects.

The list includes, for each tool or resource:

- Domain and name
- A tool's argument fields: each field's name and type, and which fields are required
- A resource's URI, or its URI template when the URI depends on the prompt

On `answer`, `messages` ([HTTP-MCP-REC-003](./record.md)) include this list. For a tool or resource that ran, the list comes before its result.

Traces:

- [FR-MCP-SEL-006](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-ARG-001](../../../requirements/fr/mcp/arguments.md)
- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)
