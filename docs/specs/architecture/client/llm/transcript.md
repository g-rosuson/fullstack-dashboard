# Client — Chat transcript

Surface: chat transcript

## CLIENT-LLM-PRM-001 — Answer with nothing attached

- Setup: no tools or resources attached
- Action: send a prompt
- Assert: an answer is shown, and no tool or resource was used

Traces:
- [FR-LLM-PRM-001](../../../requirements/fr/llm/prompt.md)
- [FR-LLM-PRM-002](../../../requirements/fr/llm/prompt.md)

## CLIENT-LLM-PRM-002 — Answer with something attached

- Setup: a tool or resource the prompt needs is attached
- Action: send the prompt
- Assert: an answer is shown

Traces:
- [FR-LLM-PRM-003](../../../requirements/fr/llm/prompt.md)

## CLIENT-LLM-REC-001 — Tools and resources on the answer

- Setup: one finished answer that used a tool or resource, and one that used none
- Action: view each answer
- Assert: the first names what was used; the second shows that nothing was used

Traces:
- [FR-LLM-REC-001](../../../requirements/fr/llm/record.md)

## CLIENT-LLM-REC-002 — Prompt time and answer time

- Setup: a finished prompt and answer
- Action: view them
- Assert: the prompt time and the answer time are shown separately

Traces:
- [FR-LLM-REC-002](../../../requirements/fr/llm/record.md)

## CLIENT-LLM-STR-001 — Resolved tools and resources

- Setup: a prompt with a domain attached
- Action: send the prompt
- Assert: before the answer finishes, the transcript names the tools and resources resolved for that domain

Traces:
- [FR-LLM-STR-001](../../../requirements/fr/llm/progress.md)
- [FR-LLM-STR-002](../../../requirements/fr/llm/progress.md)

## CLIENT-LLM-GRT-001 — Grant before use

- Setup: a prompt where the model chooses a tool or resource
- Action: wait until that choice is shown, then grant access
- Assert: the choice is shown and is not used before the grant; after the grant, it is used

Traces:
- [FR-LLM-GRT-001](../../../requirements/fr/llm/grant.md)
- [FR-LLM-GRT-002](../../../requirements/fr/llm/grant.md)

## CLIENT-LLM-STR-002 — Arguments and result

- Setup: a prompt that runs a tool or reads a resource
- Action: send the prompt
- Assert: as that step happens, the transcript shows which one, its arguments, and its result

Traces:
- [FR-LLM-STR-003](../../../requirements/fr/llm/progress.md)

## CLIENT-LLM-STR-003 — Model-call inputs

- Setup: a prompt that calls the model
- Action: send the prompt
- Assert: as that call happens, the transcript shows what the call was given

Traces:
- [FR-LLM-STR-004](../../../requirements/fr/llm/progress.md)

## CLIENT-LLM-STR-004 — Failure while answering

- Setup: a prompt whose tool or resource fails
- Action: send the prompt
- Assert: as the failure happens, the transcript shows it and which tool or resource failed

Traces:
- [FR-LLM-STR-005](../../../requirements/fr/llm/progress.md)

## CLIENT-LLM-ERR-001 — Failure leaves the conversation

- Setup: a conversation that already has a prompt and answer, then a new prompt whose tool or resource fails
- Action: let the new prompt finish
- Assert: the earlier prompt and answer remain, and the failed prompt shows an outcome that names the error and the tool or resource

Traces:
- [FR-LLM-ERR-001](../../../requirements/fr/llm/errors.md)
- [FR-LLM-ERR-002](../../../requirements/fr/llm/errors.md)
- [FR-LLM-ERR-003](../../../requirements/fr/llm/errors.md)

## CLIENT-LLM-STP-001 — Stop

- Setup: a prompt is still being answered, and a step is already shown
- Action: stop it
- Assert: no further tool, resource, or model call appears, and the step already shown remains

Traces:
- [FR-LLM-STP-001](../../../requirements/fr/llm/stop.md)
- [FR-LLM-STP-002](../../../requirements/fr/llm/stop.md)
