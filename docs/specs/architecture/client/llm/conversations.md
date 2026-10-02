# Client — Conversations

Surface: conversation list

## CLIENT-LLM-CNV-001 — Two conversations

- Setup: no conversations yet
- Action: create two conversations
- Assert: both can be opened

Traces:
- [FR-LLM-CNV-001](../../../requirements/fr/llm/conversations.md)

## CLIENT-LLM-CNV-002 — Open another conversation

- Setup: two conversations with different prompts and answers
- Action: open the second
- Assert: its prompts and answers are shown

Traces:
- [FR-LLM-CNV-002](../../../requirements/fr/llm/conversations.md)

## CLIENT-LLM-CNV-003 — Refresh

- Setup: a conversation with a finished prompt and answer
- Action: refresh
- Assert: that conversation still shows that prompt and answer

Traces:
- [FR-LLM-CNV-003](../../../requirements/fr/llm/conversations.md)

## CLIENT-LLM-CNV-004 — Delete

- Setup: a conversation
- Action: delete it, then refresh
- Assert: it is not listed and does not open

Traces:
- [FR-LLM-CNV-004](../../../requirements/fr/llm/conversations.md)
- [FR-LLM-CNV-005](../../../requirements/fr/llm/conversations.md)
