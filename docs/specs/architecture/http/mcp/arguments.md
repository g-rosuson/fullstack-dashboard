# HTTP — MCP arguments

The model asks for the list of tools and resources, then selects from it ([HTTP-MCP-PRG-002](./prompt.md)). After the user permits one ([HTTP-MCP-SEL-003](./selection.md)), the model fills that tool or resource's arguments from the list. The processing `call` carries those arguments.

## HTTP-MCP-ARG-001 — Model fills arguments after permission

After a successful permit for a tool or resource, and on its `call` with `status` `"processing"`:

- The model fills `arguments` from the prompt, using the list in [HTTP-MCP-ARG-002](#http-mcp-arg-002--model-asks-for-the-list)
- `arguments` are those values

Traces:

- [FR-MCP-REC-001](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-ARG-002 — Model asks for the list

During `selecting` ([HTTP-MCP-PRG-002](./prompt.md)), the model asks for the list of tools and resources from the MCP server. From that list it selects the tools and resources relevant to the prompt.

The list includes, for each tool or resource:

- Domain and name
- A tool's argument fields: each field's name and type, and which fields are required
- A resource's URI, or its URI template when the URI depends on the prompt

On `answer`, `error`, and `stopped`, this list is `list` ([HTTP-MCP-REC-003](./record.md)).

Traces:

- [FR-MCP-SEL-001](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-SEL-004](../../../requirements/fr/mcp/selection.md)
- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)
