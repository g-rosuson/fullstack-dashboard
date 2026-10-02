# Tool and resource failures

The in-progress failure step is [FR-LLM-STR-005](./progress.md).

- **FR-LLM-ERR-001** — A tool or resource failure shall leave the conversation and its earlier prompts and answers in place.
- **FR-LLM-ERR-002** — After that failure, the system shall still show an outcome for the prompt.
- **FR-LLM-ERR-003** — That outcome shall name the error and the tool or resource that failed.
