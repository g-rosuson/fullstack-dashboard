# ADR-0001 — Stateless JSON-only MCP

Status: accepted

## Context

This process is a protocol router for other programs. The MCP server SDK can also serve the 2025 protocol, stream SSE, and keep sessions.

## Decision

Serve `2026-07-28` only, one JSON body per request, with no session. Each `POST` builds a new MCP server from the enrolled modules and discards it after the response.

Behavior: [FR-MCP-PRT-001](../../requirements/fr/mcp/protocol.md) through `FR-MCP-PRT-005`, `FR-MCP-PRT-008`, and `FR-MCP-PRT-009`.

## Consequences

Mid-call notifications are dropped. `subscriptions/listen` is not a product surface.
