# Context

Finished turns of a conversation included with a new prompt. A turn is one prompt and its answer. Turns go to the model in the order they are kept.

- **FR-MCP-CTX-001** — When the user selects finished turns, the system shall pass only those turns to the model with the new prompt.
- **FR-MCP-CTX-002** — When the user selects no turns, the system shall pass every finished turn of that conversation to the model with the new prompt.
- **FR-MCP-CTX-003** — The system shall reject a prompt that names a turn that is not a finished turn of that conversation, or that names the same turn more than once, and shall leave the conversation unchanged.
