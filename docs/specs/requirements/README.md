# Requirements

Functional and non-functional requirements for this product.

- How to write and trace: [software-requirements-specification](../../guides/software-docs/software-requirements-specification.md)
- Doc stack: [software-documentation](../../guides/software-docs/software-documentation.md)
- HTTP acceptance (not requirements): [architecture/http](../architecture/http/README.md)
- Client acceptance (not requirements): [architecture/client](../architecture/client/README.md)

FRs state **what** the system shall do. NFRs state **how well**. Implementation details belong in architecture docs, not here.

## Layout

- `fr/<domain>/` — business capability (e.g. `auth`, `jobs`, `ui`)
- `nfr/<attribute>/` — quality attribute (e.g. `security`, `reliability`, `accessibility`)

## Domains

- [fr/auth](./fr/auth/index.md) — `FR-AUTH-*`
- [fr/jobs](./fr/jobs/index.md) — `FR-JOBS-*`
- [fr/ui](./fr/ui/index.md) — `FR-UI-*`
- [fr/mcp](./fr/mcp/index.md) — `FR-MCP-*`
- [nfr/security/authentication.md](./nfr/security/authentication.md) — `NFR-SEC-AUTH-*`
- [nfr/security/mcp.md](./nfr/security/mcp.md) — `NFR-SEC-MCP-*`
- [nfr/reliability/jobs.md](./nfr/reliability/jobs.md) — `NFR-REL-JOBS-*`
- [nfr/accessibility/ui.md](./nfr/accessibility/ui.md) — `NFR-A11Y-UI-*`

## Identifiers

- Functional: `FR-<DOMAIN>-<CAPABILITY>-###` — e.g. `FR-AUTH-REG-001`, `FR-JOBS-CRT-001`
- Non-functional: `NFR-<ATTR>-<DOMAIN>-###` — e.g. `NFR-SEC-AUTH-001`

Organize by business domain and capability. Do not create `FR-HTTP-*` or flat `FR-001` sequences. Technical boundaries cite FRs from architecture acceptance.

Each FR capability — and each NFR attribute+domain pair — has its own sequence. Next free number only; never renumber; retired IDs stay unused.

## Writing

Short prose lists. **Shall** for mandatory behavior. No tables in requirement documents.
