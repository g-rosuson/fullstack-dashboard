# Failure

A failed tool or resource, and a failure of the model provider or the server.

- **FR-MCP-FLR-001** — When a tool or resource fails, the system shall continue the remaining steps of that prompt.
- **FR-MCP-FLR-002** — When the model provider or the server fails, the system shall end the prompt with context about what went wrong.
- **FR-MCP-FLR-003** — When a finished answer cannot be kept, the system shall end the prompt with context about what went wrong and shall not add that prompt and answer to the conversation.
