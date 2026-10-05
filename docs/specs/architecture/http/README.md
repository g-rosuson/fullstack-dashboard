# HTTP acceptance

API-boundary scenarios that realize FRs. Not requirements — see [requirements](../../requirements/README.md).

OpenAPI is the machine-readable contract; these docs are the human-readable, ID-traced scenarios for tests and implementation.

## Rules

- One file per capability (mirrors `docs/specs/requirements/fr/<domain>/`)
- Route once at the top of the file (or section)
- Each scenario: unique ID, linked FR(s) / NFR(s), then status + assertable body/cookie shape
- No “shall” language; do not restate domain intent
- Client-only FRs (views, redirects, client lifecycle) belong in [client acceptance](../client/README.md), not here
- Pin fields tests assert; leave full request/response schemas to OpenAPI / Zod

## Identifiers

Pattern: `HTTP-<DOMAIN>-<CAPABILITY>-###`  
Examples: `HTTP-AUTH-REG-001`, `HTTP-AUTH-LOG-002`

Each capability has its own sequence. Never renumber. Retired IDs stay unused.

Tests and implementation cite the HTTP ID (and may also cite the FR). Every HTTP ID cites at least one FR.

## Response envelopes

All datetimes on the wire are ISO-8601 / RFC 3339 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`), including envelope timestamps and resource/event fields (e.g. `createdAt`, `startDate`, `nextRun`).

Success:

```text
{ success: true, data?: T, meta: { timestamp: string } }
```

Error (from exceptions middleware only):

```text
{ success: false, code: string, timestamp: string, issues?: ValidationIssue[], data?: unknown }
```

`code` values are the API error taxonomy (e.g. `VALIDATION_ERROR`, `NOT_FOUND_ERROR`).  
`issues` is present for validation failures; omit asserting `data` on errors unless a scenario requires it.

## Domain index

Each `http/<domain>/index.md` lists canonical routes and links to scenario files only. Do not repeat these rules there.

- [auth/](./auth/index.md) — `HTTP-AUTH-*`
- [jobs/](./jobs/index.md) — `HTTP-JOBS-*`
- [mcp/](./mcp/index.md) — `HTTP-MCP-*`
