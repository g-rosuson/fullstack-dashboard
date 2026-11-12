# Conversation status

How a conversation is shown in the list. This is the conversation's status, not the status of a tool or resource in the queue.

- **FR-MCP-CST-001** — A conversation shall be shown as processing, waiting for permission, or failed without opening it. Otherwise it shall show no status.
- **FR-MCP-CST-002** — A conversation shall be processing while a prompt is being sent, selected, called, or saved, and while the model is working on the next step after a tool or resource batch.
- **FR-MCP-CST-003** — A failed or refused call shall leave the conversation processing.
- **FR-MCP-CST-004** — A conversation shall be waiting for permission while an ask is open.
- **FR-MCP-CST-005** — A prompt that fails, including one that does not start, shall show the conversation as failed.
- **FR-MCP-CST-006** — A finished answer or a stop shall clear a failed conversation.
