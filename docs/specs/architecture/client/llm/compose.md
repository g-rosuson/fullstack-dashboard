# Client — Chat composer

Surface: chat composer

## CLIENT-LLM-SEL-001 — Grouped by domain

- Setup: tools and resources in at least two domains
- Action: open the chooser
- Assert: each tool and resource is listed under its domain

Traces:
- [FR-LLM-SEL-001](../../../requirements/fr/llm/selection.md)

## CLIENT-LLM-SEL-002 — Whole domain

- Setup: a domain with more than one tool or resource
- Action: attach the whole domain
- Assert: every tool and resource in that domain is attached

Traces:
- [FR-LLM-SEL-002](../../../requirements/fr/llm/selection.md)

## CLIENT-LLM-SEL-003 — Single items from two domains

- Setup: two domains, each with at least two tools or resources
- Action: attach one item from each domain
- Assert: only those two items are attached

Traces:
- [FR-LLM-SEL-003](../../../requirements/fr/llm/selection.md)

## CLIENT-LLM-SEL-004 — Attached list

- Setup: at least one tool or resource is attached
- Action: view the composer, then change the selection with the keyboard
- Assert: each attachment’s accessible name is its domain and name, and the keyboard change updates the selection

Traces:
- [FR-LLM-SEL-004](../../../requirements/fr/llm/selection.md)
- [NFR-A11Y-UI-001](../../../requirements/nfr/accessibility/ui.md)
- [NFR-A11Y-UI-002](../../../requirements/nfr/accessibility/ui.md)

## CLIENT-LLM-CTX-001 — Choose earlier prompts and answers

- Setup: a conversation with two finished prompts and answers
- Action: include one in a new prompt and leave the other out
- Assert: the new prompt includes only the chosen one

Traces:
- [FR-LLM-CTX-001](../../../requirements/fr/llm/context.md)
- [FR-LLM-CTX-002](../../../requirements/fr/llm/context.md)
