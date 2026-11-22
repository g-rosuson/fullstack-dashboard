# Client — Context

Surface: chat

Finished turns of this conversation can go with a new prompt ([HTTP-MCP-PRG-007](../../http/mcp/prompt.md)). Selecting turns does not remove them from the conversation.

## CLIENT-MCP-CTX-001 — Selected turns

- Setup: the conversation has more than one finished turn
- Action: select some of those turns and send a prompt
- Assert: the prompt starts; a finished turn that was not selected stays in the conversation

Traces:

- [FR-MCP-CTX-001](../../../requirements/fr/mcp/context.md)
- [HTTP-MCP-CTX-001](../../http/mcp/context.md)

## CLIENT-MCP-CTX-002 — No selection

- Setup: the conversation has finished turns
- Action: send a prompt without selecting turns
- Assert: the prompt starts

Traces:

- [FR-MCP-CTX-002](../../../requirements/fr/mcp/context.md)
- [HTTP-MCP-CTX-002](../../http/mcp/context.md)

## CLIENT-MCP-CTX-003 — Unknown or repeated turn

- Setup: a conversation is open
- Action: send a prompt that names a turn that is not a finished turn of this conversation, or that names the same turn twice
- Assert: the prompt does not start; the conversation’s turns are unchanged

Traces:

- [FR-MCP-CTX-003](../../../requirements/fr/mcp/context.md)
- [HTTP-MCP-CTX-003](../../http/mcp/context.md)

## CLIENT-MCP-CTX-004 — Add a turn

- Setup: the conversation has more than one finished turn
- Action: add one finished turn to the next prompt
- Assert: that turn is shown in the composer and can be told apart from the other turns; it remains in the conversation

Traces:

- [FR-MCP-CTX-004](../../../requirements/fr/mcp/context.md)
- [FR-MCP-CTX-005](../../../requirements/fr/mcp/context.md)

## CLIENT-MCP-CTX-005 — Remove a turn

- Setup: a finished turn is shown in the composer as added
- Action: remove that turn from the composer
- Assert: it is no longer shown as added; it remains in the conversation

Traces:

- [FR-MCP-CTX-006](../../../requirements/fr/mcp/context.md)

## CLIENT-MCP-CTX-006 — Address keeps the added turns

- Setup: a finished turn is added to the next prompt
- Action: open that same conversation address again
- Assert: the same turn is shown as added; an address with no added turns shows none

Traces:

- [FR-MCP-CTX-007](../../../requirements/fr/mcp/context.md)
