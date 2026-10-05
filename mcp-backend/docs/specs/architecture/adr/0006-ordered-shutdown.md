# ADR-0006 — Ordered shutdown

Status: accepted

## Context

Signals, crashes, and a failed start need the same cleanup, and a second signal must not run it twice.

## Decision

One shutdown path marks the process not live and not ready, then stops the listener, closes the MCP handler, and flushes error reporting, bounded by the configured timeout. A re-entrant call returns immediately.

Behavior: [FR-HEALTH-LIV-001](../../requirements/fr/health/probes.md), [NFR-REL-PRC-005](../../requirements/nfr/reliability/process.md) through `NFR-REL-PRC-009`.

## Consequences

Exit codes are asserted on the process. Health probes only show that live and ready have flipped.
