# Stop

Tool and resource failures are [FR-LLM-ERR-*](./errors.md).

- **FR-LLM-STP-001** — While a prompt is being answered, the system shall allow the user to stop it.
- **FR-LLM-STP-002** — After a stop, the system shall not run further tools, resources, or model calls for that prompt, and shall keep steps already shown.
