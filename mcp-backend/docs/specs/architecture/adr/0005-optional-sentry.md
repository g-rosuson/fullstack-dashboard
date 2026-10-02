# ADR-0005 — Optional Sentry and MCP trace continuation

Status: accepted

## Context

Operators may run with no error tracker. MCP clients put W3C `traceparent` and `baggage` on JSON-RPC `_meta`, not on HTTP headers, so HTTP tracing would otherwise start a disconnected trace.

## Decision

Leave Sentry uninitialized when the DSN is blank or omitted. When it is set, continue the trace from `_meta` on the root body or under `params`. Do not enable Sentry's uncaught-exception, unhandled-rejection, or Bun server integrations; this process already reports those crashes, and Hono already traces the request.

Behavior: [NFR-REL-PRC-002](../../requirements/nfr/reliability/process.md), [NFR-OBS-TEL-005](../../requirements/nfr/observability/telemetry.md), [NFR-SEC-BND-010](../../requirements/nfr/security/boundary.md).
