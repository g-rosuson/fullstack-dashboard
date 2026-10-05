# Tickets

Work slices that break the SRS into implementable units. Not a status board — no open/done fields. Completion lives in git / PRs.

How to author tickets: [`.agents/skills/writing-tickets/SKILL.md`](../../.agents/skills/writing-tickets/SKILL.md).  
For FR / HTTP / CLIENT IDs, prose, and where a behavior belongs in the SRS stack, follow [`.agents/skills/writing-docs/SKILL.md`](../../.agents/skills/writing-docs/SKILL.md).

## Layout

```text
docs/tickets/
├── README.md
└── <domain>/
    └── tkt-<domain>-###-<slug>.md
```

- One ticket per file
- Domain folder matches the ID domain (`ui`, `jobs`, `auth`, …)
- Filename: lowercase id + short kebab slug

## ID

`TKT-<DOMAIN>-###` — e.g. `TKT-UI-001`

Per-domain sequence. Next free only. Never renumber. Retired IDs stay unused.

## Labels

Purpose only. Inline after the branch line:

| Label | Use |
|-------|-----|
| `feature` | New or extended product behavior |
| `fix` | Correct broken behavior |
| `chore` | Non-user-facing / shared infrastructure |
| `docs` | Specs or guides only |
| `spike` | Time-boxed investigation |

## Shape

```markdown
# TKT-<DOMAIN>-### — Short title

`feat/tkt-<domain>-###-<slug>`

Labels: `feature`

## User story

As a …, I want … so that ….

## Definition of done

- [ ] …
- [ ] …

## Traces

- [FR-…](../../specs/requirements/…)
```

- **Branch** — `<prefix>/tkt-<domain>-###-<slug>` directly under the title. Prefix from the label: `feature` → `feat`, otherwise the label (`fix`, `chore`, `docs`, `spike`)
- **User story** — one short As a / I want / so that (or equivalent)
- **DoD** — checklist for this slice; link acceptance scenarios instead of rewriting them
- **Traces** — relative links to FR (required when product-facing); HTTP/CLIENT when relevant (see writing-docs skill)
- No status, assignees, or estimates in the body

## Domains

- [ui](./ui/)
- [jobs](./jobs/)
- [mcp](./mcp/)
