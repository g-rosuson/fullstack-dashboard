# ADR-0002 — Callers are not authenticated here

Status: accepted

## Context

The consumer that launches this process already knows who the user is.

## Decision

Do not verify caller credentials, and do not put caller or domain secrets in the platform environment schema. A domain module keeps its own secrets.

Behavior: [FR-MCP-PRT-007](../../requirements/fr/mcp/protocol.md).

## Consequences

Exposure is limited by the network, the host allowlist, or a consumer in front of this process.
