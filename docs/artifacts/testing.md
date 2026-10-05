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

**Local Mongo for integration:** `docker compose -f docker-compose.e2e.yml up -d mongo --wait` (CI-aligned) or `docker compose -f docker-compose.dev.yml up -d mongo` if you already use the full dev stack. URI in [`.env.integration.test`](../backend/.env.integration.test) must reach `127.0.0.1:27017`.

## Frontend (`frontend/`)

| Layer | Scope | Where | Config |
|-------|--------|-------|--------|
| **Unit / component** | React components, utilities; **jsdom** + Testing Library | `src/**/*.test.{ts,tsx}` (and `*.unit.test.tsx` where used) | [`vite.config.mts`](../frontend/vite.config.mts) `test` block; [`test/vitest.setup.ts`](../frontend/test/vitest.setup.ts) |

**Command** (from `frontend/`): `npm test` — Vitest (watch by default).

## Continuous integration

Backend integration and E2E tests use the same MongoDB topology as development: a single-node replica set (`mongod --replSet rs0`). CI starts Mongo via [`docker-compose.e2e.yml`](../docker-compose.e2e.yml) (mongo-only, no gitignored `.env.dev`). Local full dev stack uses [`docker-compose.dev.yml`](../docker-compose.dev.yml).

1. **Unit:** reusable workflow runs `npm ci` then `npx vitest run` with default reporters plus JUnit under `test-results/` for **backend** and **frontend** in parallel matrix legs.
2. **Backend integration:** runs only after unit succeeds; starts Mongo via `docker compose -f docker-compose.e2e.yml up -d mongo --wait`, then `vitest run --config vitest.integration.config.mjs` with JUnit output.
3. **E2E (main only):** on push to `main`, [`reusable-e2e-tests.yml`](../.github/workflows/reusable-e2e-tests.yml) runs before deploy — Mongo (`docker-compose.e2e.yml`), `npm run build` + `start:e2e:built`, then Playwright smoke + auth. PR workflows skip E2E; see [`ci-cd.md`](../requirements/ci-cd.md).
4. **MCP exposure (main only):** on push to `main`, [`reusable-mcp-exposure.yml`](../.github/workflows/reusable-mcp-exposure.yml) runs `npm run test:mcp` in parallel with E2E. Deploy waits for both. Pull requests skip it. Details: [`tests/mcp/README.md`](../tests/mcp/README.md).

PR merge expectations are summarized in [`docs/requirements/ci-cd.md`](../requirements/ci-cd.md).

## End-to-end (repo root)

Playwright E2E tests live in [`tests/e2e/`](../tests/e2e/). Smoke specs need only the frontend;

**CI keeps the backend off Docker to stay fast.** Building and starting a backend container on every run would add meaningful time. Instead, CI runs `npm run build` then the same host-process entrypoint as production (`node dist/src/main.js` via [`start-e2e-backend.sh`](../.github/scripts/start-e2e-backend.sh)). Mongo stays in Docker ([`docker-compose.e2e.yml`](../docker-compose.e2e.yml)); Playwright starts Vite dev for the frontend. E2E does not replay [`docker-compose.prod.yml`](../docker-compose.prod.yml) in GHA.

**Port 3000 is a consequence of that choice.** Because the backend runs on the host as an unprivileged user, Linux blocks ports below 1024 — `:1000` fails with `EACCES` on the runner. E2E sets `PORT=3000` in [`.env.e2e.test`](../backend/.env.e2e.test). Docker dev/prod still use `:1000` inside containers. [Details](guides/e2e-testing.md#why-port-3000-for-e2e-not-1000).

**Commands** (from repo root):

- `npm run test:e2e` — smoke + auth (Chromium + Firefox locally)
- `npm run test:e2e:report` — open last HTML report

Full setup and troubleshooting: [`guides/e2e-testing.md`](guides/e2e-testing.md) ([local auth stack](guides/e2e-testing.md#local-full-stack-auth-tests)). Requirements: [`auth-e2e-contract.md`](../business-requirements/auth-e2e-contract.md), [`jobs-e2e-contract.md`](../business-requirements/jobs-e2e-contract.md).

**Local full stack for auth** (details in the E2E guide):

```bash
docker compose -f docker-compose.dev.yml stop frontend   # avoid stale Vite on :5173 / wrong API URL
docker compose -f docker-compose.e2e.yml up -d mongo --wait
cd backend && npm run start:e2e   # separate terminal; API on :3000
npm run test:e2e                  # repo root; Playwright starts Vite with VITE_BACKEND_URL=:3000
```

Backend env: [`.env.e2e.test`](../backend/.env.e2e.test).

## Conventions (quick reference)

- Name tests `*.test.ts` / `*.test.tsx` (or `*.unit.test.tsx` where the frontend distinguishes heavier suites).
- Prefer integration specs for **HTTP and persistence contracts**; keep unit tests fast and free of real DB unless unavoidable.
- Backend integration specs reference requirement docs where applicable (e.g. `docs/business-requirements/auth-http-contract.md`, `docs/business-requirements/auth-e2e-contract.md`, `docs/business-requirements/jobs-http-contract.md`).
