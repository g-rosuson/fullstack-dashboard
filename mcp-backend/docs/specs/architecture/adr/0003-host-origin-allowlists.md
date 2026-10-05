# ADR-0003 — Host and origin allowlists

Status: accepted

## Context

A loopback server can still be reached by a browser through DNS rebinding. The MCP Hono helper can check `Host` and `Origin` before the handler runs.

## Decision

Always apply a host allowlist. Apply an origin allowlist when one is configured, and on loopback when it is not. Off loopback, origin is unchecked until configured.

Behavior: [NFR-SEC-BND-001](../../requirements/nfr/security/boundary.md) through `NFR-SEC-BND-008`.
