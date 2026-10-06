# HTTP — MCP failure

Events on the prompt stream ([HTTP-MCP-PRG-001](./prompt.md)).

## HTTP-MCP-FLR-001 — Tool or resource failure continues

A tool or resource fails, and the prompt still has a later step.

- Stream:
  - Event: `type` `"call"`, `status` `"failed"`, with that `domain`, `name`, and `kind`
  - A later event for the same `promptId` with `type` `"call"`, `"answering"`, or `"answer"`

Traces:

- [FR-MCP-FLR-001](../../../requirements/fr/mcp/failure.md)
- [FR-MCP-PRG-004](../../../requirements/fr/mcp/progress.md)

## HTTP-MCP-FLR-002 — Model provider or server failure

The model provider or the server fails while the prompt is being answered.

- Stream:
  - Event: `type` `"error"`
  - `context`: non-empty string
  - No `answer` event for that `promptId`

Traces:

- [FR-MCP-FLR-002](../../../requirements/fr/mcp/failure.md)
