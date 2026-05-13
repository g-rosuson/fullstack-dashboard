# Testing overview

This repo uses **Vitest** for backend and frontend. Tests run **locally** from each package directory; **pull requests targeting `main`** run the same unit suites in CI, then backend integration tests against MongoDB (see [`.github/workflows/pull-request-validation.yml`](../.github/workflows/pull-request-validation.yml)).

## Backend (`backend/`)

| Layer | Scope | Where | Config |
|-------|--------|-------|--------|
| **Unit** | Modules in isolation (Node, mocked or no external services) | `src/**/*.test.ts` | [`vitest.config.mjs`](../backend/vitest.config.mjs) — fixed test `env` (including in-memory Mongo URI) |
| **Integration** | Real Express app, MongoDB, HTTP contracts (`supertest`) | `test/integration/**/*.test.ts` | [`vitest.integration.config.mjs`](../backend/vitest.integration.config.mjs) loads [`.env.integration.test`](../backend/.env.integration.test); fork pool, `singleFork` |

Integration helpers ([`test/integration/harness.ts`](../backend/test/integration/harness.ts)): initialize the real server, clear collections / cron state between cases, expose a Supertest agent.

**Commands** (from `backend/`):

- `npm test` — Vitest watch mode (default config = unit only).
- `npm run test:integration` — one-shot integration run (requires Mongo reachable per `.env.integration.test`, typically `127.0.0.1:27017`).

**Local Mongo for integration:** align with dev Compose (e.g. `docker compose -f docker-compose.dev.yml up -d mongo`) so the URI in `.env.integration.test` matches your machine.

## Frontend (`frontend/`)

| Layer | Scope | Where | Config |
|-------|--------|-------|--------|
| **Unit / component** | React components, utilities; **jsdom** + Testing Library | `src/**/*.test.{ts,tsx}` (and `*.unit.test.tsx` where used) | [`vite.config.mts`](../frontend/vite.config.mts) `test` block; [`test/vitest.setup.ts`](../frontend/test/vitest.setup.ts) |

**Command** (from `frontend/`): `npm test` — Vitest (watch by default).

## Continuous integration

Backend integration tests exercise the same MongoDB topology the app expects in development: a single-node replica set (`mongod --replSet rs0` in [`docker-compose.dev.yml`](../docker-compose.dev.yml)). The reusable workflow therefore starts Mongo with that Compose file rather than a minimal standalone container, so transactions, driver behavior, and any replica-set-aware code paths stay aligned with local dev and CI.

1. **Unit:** reusable workflow runs `npm ci` then `npx vitest run` with default reporters plus JUnit under `test-results/` for **backend** and **frontend** in parallel matrix legs.
2. **Backend integration:** runs only after unit succeeds; starts Mongo via `docker compose -f docker-compose.dev.yml up -d mongo --wait`, then `vitest run --config vitest.integration.config.mjs` with JUnit output.

PR merge expectations are summarized in [`docs/requirements/ci-cd.md`](../requirements/ci-cd.md).

## Conventions (quick reference)

- Name tests `*.test.ts` / `*.test.tsx` (or `*.unit.test.tsx` where the frontend distinguishes heavier suites).
- Prefer integration specs for **HTTP and persistence contracts**; keep unit tests fast and free of real DB unless unavoidable.
- Backend integration specs reference requirement docs where applicable (e.g. `docs/requirements/auth-http-contract.md`, jobs contract).
