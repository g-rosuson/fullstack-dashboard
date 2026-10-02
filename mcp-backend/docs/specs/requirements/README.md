# Requirements

Functional and non-functional requirements for this MCP server.

- How to write and trace: [software-requirements-specification](../../guides/software-docs/software-requirements-specification.md)
- Doc stack: [software-documentation](../../guides/software-docs/software-documentation.md)
- HTTP acceptance (not requirements): [architecture/http](../architecture/http/README.md)

FRs state **what** the system shall do. NFRs state **how well**. Routes, status codes, and header names belong in architecture docs, not here.

## Layout

- `fr/<domain>/` — product capability
- `nfr/<attribute>/` — quality attribute

## Domains

- [fr/mcp](./fr/mcp/index.md) — `FR-MCP-*`
- [fr/echo](./fr/echo/index.md) — `FR-ECHO-*`
- [fr/health](./fr/health/index.md) — `FR-HEALTH-*`
- [nfr/security/boundary.md](./nfr/security/boundary.md) — `NFR-SEC-BND-*`
- [nfr/reliability/process.md](./nfr/reliability/process.md) — `NFR-REL-PRC-*`
- [nfr/observability/telemetry.md](./nfr/observability/telemetry.md) — `NFR-OBS-TEL-*`

## Identifiers

- Functional: `FR-<DOMAIN>-<CAPABILITY>-###` — e.g. `FR-MCP-PRT-001`, `FR-ECHO-MSG-001`
- Non-functional: `NFR-<ATTR>-<DOMAIN>-###` — e.g. `NFR-SEC-BND-001`

Organize by product domain and capability. Do not create `FR-HTTP-*` or flat `FR-001` sequences. Technical boundaries cite FRs from architecture acceptance.

Each FR capability — and each NFR attribute+domain pair — has its own sequence. Next free number only; never renumber; retired IDs stay unused.

## Writing

Short prose lists. **Shall** for mandatory behavior. No tables in requirement documents.
