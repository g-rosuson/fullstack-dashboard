# Selection

The model selects the tools and resources a prompt uses, one at a time, with their arguments. The user allows or refuses each one. The model then selects the next one, or writes the answer.

- **FR-MCP-SEL-001** — The system shall select the tools and resources relevant to the prompt.
- **FR-MCP-SEL-002** — The system shall ask permission for one tool or resource at a time.
- **FR-MCP-SEL-003** — The system shall reject a permission that does not match the tool or resource it is asking for.
- **FR-MCP-SEL-004** — The system shall provide the list of tools and resources when the model asks for it.
- **FR-MCP-SEL-005** — The system shall allow the user to refuse the tool or resource it is asking for, and shall skip it.
- **FR-MCP-SEL-006** — The system shall keep a permission ask open until the user allows it, refuses it, or stops the prompt.
- **FR-MCP-SEL-007** — After a refusal, the system shall continue the remaining steps of that prompt.
- **FR-MCP-SEL-010** — The system shall show the arguments of a tool or resource when it asks permission for it.
- **FR-MCP-SEL-011** — The system shall fill the arguments of each tool or resource using the results of the tools and resources that ran before it in that prompt.
