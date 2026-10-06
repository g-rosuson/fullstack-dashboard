# Stop

Stopping a prompt while it is being answered. A stop cancels work already running and blocks anything still to start.

- **FR-MCP-STP-001** — The system shall allow the user to stop a prompt while it is being answered.
- **FR-MCP-STP-002** — After a stop, the system shall not start another tool call, resource read, or model call for that prompt.
- **FR-MCP-STP-003** — The system shall reject a stop when that prompt is not being answered.
- **FR-MCP-STP-004** — When the user stops a prompt, the system shall cancel a tool call, resource read, or model call that is already running for that prompt.
- **FR-MCP-STP-005** — The system shall report a stop as its own outcome, and shall not report a cancelled tool or resource as succeeded or failed.
