# Client acceptance

UI-boundary scenarios that realize FRs. Not requirements — see [requirements](../../requirements/README.md).

HTTP acceptance covers the API; these docs cover what the owner sees and does in the application. E2E tests cite client IDs (and may also cite HTTP IDs when an API outcome must be visible).

## Rules

- Organize by **UI surface** (route, sheet, list entry). Do not mirror FR/HTTP folder trees when that splits one owner-visible interaction
- **Single home** for each observable; cross-link by client ID instead of duplicating asserts
- Observational scenarios are valid when the assert is presentation state (badge, primary action, schedule cues)
- Route (or surface) once at the top of the file
- Each scenario: unique ID, linked FR(s), then setup → action → assertable UI outcome
- No “shall” language; do not restate domain intent
- Do not restate HTTP request/response bodies; cite `HTTP-*` when the UI depends on a specific API outcome
- Pin what tests assert (visible text/roles, navigation, state the user can observe); leave component internals and selectors to test code
- Server-only / runtime-only FRs (e.g. reboot attach rules) stay out of this tree unless the owner must observe an outcome in the UI

## Identifiers

Pattern: `CLIENT-<DOMAIN>-<CAPABILITY>-###`  
Examples: `CLIENT-JOBS-CRT-001`, `CLIENT-AUTH-LOG-001`

Capability prefixes stay on IDs for FR/HTTP tracing; file layout follows the UI surface. Each capability has its own sequence. Never renumber. Retired IDs stay unused.

Tests and implementation cite the client ID (and may also cite the FR and HTTP ID). Every client ID cites at least one FR.

## Domain index

Each `client/<domain>/index.md` lists the surface and links to scenario files only. Do not repeat these rules there.

- [auth/](./auth/index.md) — `CLIENT-AUTH-*`
- [jobs/](./jobs/index.md) — `CLIENT-JOBS-*`
- [mcp/](./mcp/index.md) — `CLIENT-MCP-*`
- [ui/](./ui/index.md) — `CLIENT-UI-*`
