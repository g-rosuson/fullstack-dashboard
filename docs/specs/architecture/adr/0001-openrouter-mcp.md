# ADR-0001 — OpenRouter for MCP prompts

Status: accepted

## Context

Answering a prompt calls a model to select tools and resources and write the answer. The first iteration uses one provider. The provider and the model id stay out of the product requirements.

## Decision

The backend calls OpenRouter for that model. The backend process reads two environment variables:

- `OPENROUTER_API_KEY` — API key
- `OPENROUTER_MODEL` — model id

Both are required. Set them in `backend/.env.dev` and `backend/.env.prod`.

This serves [FR-MCP-PRG-002](../../requirements/fr/mcp/progress.md), [FR-MCP-SEL-002](../../requirements/fr/mcp/selection.md), [FR-MCP-SEL-006](../../requirements/fr/mcp/selection.md), [FR-MCP-ARG-001](../../requirements/fr/mcp/arguments.md), [FR-MCP-CTX-001](../../requirements/fr/mcp/context.md), [FR-MCP-CTX-002](../../requirements/fr/mcp/context.md), and [FR-MCP-FLR-002](../../requirements/fr/mcp/failure.md).

The call includes the conversation turns ([HTTP-MCP-CTX-001](../http/mcp/context.md), [HTTP-MCP-CTX-002](../http/mcp/context.md)). The model asks for the tool and resource list and fills arguments from it ([HTTP-MCP-ARG-002](../http/mcp/arguments.md)).

## Consequences

A failed OpenRouter call ends the prompt as a model-provider failure ([HTTP-MCP-FLR-002](../http/mcp/failure.md)). Another provider is a later decision.
