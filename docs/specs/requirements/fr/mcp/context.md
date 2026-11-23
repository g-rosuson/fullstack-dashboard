# Context

Finished turns of a conversation included with a new prompt. A turn is one prompt and its answer. Turns go to the model in the order they are kept.

- **FR-MCP-CTX-001** — When the user selects finished turns, the system shall pass only those turns to the model with the new prompt.
- **FR-MCP-CTX-002** — When the user selects no turns, the system shall pass every finished turn of that conversation to the model with the new prompt.
- **FR-MCP-CTX-003** — The system shall reject a prompt that names a turn that is not a finished turn of that conversation, or that names the same turn more than once, and shall leave the conversation unchanged.
- **FR-MCP-CTX-004** — The system shall let the user add a finished turn of the open conversation to the next prompt.
- **FR-MCP-CTX-005** — While a turn is added to the next prompt, the place where the user writes that prompt shall show which turn is added.
- **FR-MCP-CTX-006** — The user shall be able to remove an added turn from the next prompt from the place where they write that prompt.
- **FR-MCP-CTX-007** — The turns added to the next prompt shall be part of that conversation’s address, and opening that address shall show the same added turns.
