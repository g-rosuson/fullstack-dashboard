# HTTP — MCP context

Earlier turns sent with a new prompt ([HTTP-MCP-PRG-007](./prompt.md)). They are finished turns saved on the conversation ([HTTP-MCP-CNV-003](./conversation.md)), oldest first. The new prompt follows them.

`turnIds` on the prompt body chooses the turns. Omit it, or send it empty, and every finished turn is used. Send ids, and only those turns are used.

## HTTP-MCP-CTX-001 — Selected turns go to the model

- `turnIds` lists one or more ids
- Each id is a finished turn of that conversation
- When the prompt ends (`answer`, `error`, or `stopped`), `messages` ([HTTP-MCP-REC-003](./record.md)) lists only those turns, in saved order: each old prompt as `user`, its answer as `assistant`, then the new prompt as `user`
- The tool and resource list is `list` on that event
- A finished turn of that conversation whose id is not in `turnIds` is absent

Traces:

- [FR-MCP-CTX-001](../../../requirements/fr/mcp/context.md)
- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-CTX-002 — No selection uses every turn

- `turnIds` is omitted or empty
- When the prompt ends (`answer`, `error`, or `stopped`), `messages` lists every finished turn of that conversation, in saved order, then the new prompt as `user`
- The tool and resource list is `list` on that event
- A conversation with no finished turns lists the new prompt only

Traces:

- [FR-MCP-CTX-002](../../../requirements/fr/mcp/context.md)
- [FR-MCP-REC-003](../../../requirements/fr/mcp/record.md)

## HTTP-MCP-CTX-003 — Unknown or repeated turn

`turnIds` names a turn that is not a finished turn of that conversation, or names the same turn more than once.

- Request: [HTTP-MCP-PRG-007](./prompt.md) with that `turnIds`
- Response:
  - Status: `422`
  - Body: `{ success: false, code: "BUSINESS_LOGIC_ERROR", timestamp: string }`
- The conversation is not reserved for this prompt
- No prompt events are sent for this request

Traces:

- [FR-MCP-CTX-003](../../../requirements/fr/mcp/context.md)
