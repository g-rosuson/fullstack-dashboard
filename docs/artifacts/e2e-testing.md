# E2E Testing Guide

End-to-end browser tests for the React frontend using Playwright (`@playwright/test`). Tests live at the repo root so they stay separate from Vitest unit tests and from the backend's Playwright scraping library.

---

## Prerequisites

- Node.js 22
- Root and frontend dependencies installed:

```bash
npm ci
cd frontend && npm ci && cd ..
```

- Playwright browsers (first time only):

```bash
# Local — Chromium and Firefox only (WebKit runs in CI)
npx playwright install chromium firefox
```

```bash
# CI / Linux — all three browsers plus system dependencies
npx playwright install --with-deps chromium firefox webkit
```

---

## Browsers: local vs CI

| Environment | Projects | Why |
|---|---|---|
| Local (`npm run test:e2e`) | Chromium, Firefox | WebKit is skipped — Playwright does not support WebKit on older macOS versions (e.g. macOS 13) |
| CI (`CI=true`) | Chromium, Firefox, WebKit | Ubuntu runners install all three via `--with-deps` |

To run a single browser locally:

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
```

To opt into WebKit locally on a supported OS, set `CI=true`:

```bash
CI=true npm run test:e2e -- --project=webkit
```

---

## Running tests

From the repo root:

```bash
npm run test:e2e              # Chromium + Firefox locally; all three in CI
npm run test:e2e:ui           # interactive UI mode
npm run test:e2e:headed       # visible browser window
npm run test:e2e:debug        # step-through debugger
npm run test:e2e:report       # open last HTML report
```

Run a single browser project:

```bash
npm run test:e2e -- --project=chromium
```

Playwright starts the Vite dev server automatically (`npm run dev` in `frontend/`), waits for `http://localhost:5173`, runs tests, then shuts the server down.

**Smoke tests only** need the command above — no Mongo or backend.

### Local full stack (auth tests)

Auth specs need Mongo, a host-process backend on `:3000`, and a **fresh** Vite dev server on `:5173` with `VITE_BACKEND_URL=http://localhost:3000`. Playwright starts Vite for you; you must **not** reuse the Docker dev frontend.

#### 1. Stop the Docker dev frontend

If you use [`docker-compose.dev.yml`](../../docker-compose.dev.yml), stop the **frontend** service (and any standalone `npm run dev` on `:5173`):

```bash
docker compose -f docker-compose.dev.yml stop frontend
```

Also stop a local Vite process if one is already bound to `:5173`.

**Why:** Playwright sets `reuseExistingServer: true` locally. If `:5173` is already taken by Docker dev or another Vite instance, Playwright reuses it. That server was built with `VITE_BACKEND_URL=http://localhost:1000` (see `docker-compose.dev.yml`), so login and session tests fail while smoke and “stay on login page” tests may still pass. E2E expects the API on **`:3000`**, not Docker’s `:1000`.

You can leave **Mongo** from either compose file running, or use the E2E mongo-only stack (step 2). Stop the Docker **backend** on `:1000` if it is running — E2E uses `npm run start:e2e` on `:3000` instead.

#### 2. Start Mongo (E2E stack)

From the repo root:

```bash
docker compose -f docker-compose.e2e.yml up -d mongo --wait
```

Uses [`docker-compose.e2e.yml`](../../docker-compose.e2e.yml) (mongo only — no gitignored `backend/.env.dev`).

#### 3. Start the backend (separate terminal)

The `start:e2e` script lives in **`backend/package.json`**, not the repo root:

```bash
cd backend && npm run start:e2e
```

This loads [`backend/.env.e2e.test`](../../backend/.env.e2e.test) via [`start-with-env-e2e.cjs`](../../backend/scripts/start-with-env-e2e.cjs) (`ts-node-dev`, no build step). Wait for `🚀 Server listening on port 3000`.

Verify:

```bash
curl -sf http://localhost:3000/api/docs/openapi
```

#### 4. Run Playwright (repo root)

In another terminal, from the repo root:

```bash
npm run test:e2e                    # smoke + auth (Chromium + Firefox)
npm run test:e2e -- tests/e2e/spec/auth   # auth only
```

Playwright starts Vite with `VITE_BACKEND_URL=http://localhost:3000` (see [`playwright.config.ts`](../../playwright.config.ts)).

To force a new Vite server even if something is still on `:5173`:

```bash
CI=true npm run test:e2e
```

#### Summary

| Step | Where | Command |
|------|--------|---------|
| Stop Docker frontend | repo root | `docker compose -f docker-compose.dev.yml stop frontend` |
| Mongo | repo root | `docker compose -f docker-compose.e2e.yml up -d mongo --wait` |
| Backend | `backend/` | `npm run start:e2e` |
| Tests | repo root | `npm run test:e2e` |

The `testUser` fixture registers a unique user via API before each auth test. Auth tests **fail closed** if the backend is not reachable on `:3000`.

Requirements: [`docs/business-requirements/auth-e2e-contract.md`](../business-requirements/auth-e2e-contract.md)

### Backend bootstrap

E2E loads test env from [`backend/.env.e2e.test`](../../backend/.env.e2e.test) (committed secrets, dedicated DB/collection names, `MONGO_URI` → `127.0.0.1:27017`).

#### Why port 3000 for E2E (not 1000)

Production and Docker dev expose the API on **port 1000** (see [`docker-compose.dev.yml`](../../docker-compose.dev.yml), [`docs/docker.md`](../docker.md)). E2E uses **port 3000** instead, set via `PORT=3000` in [`.env.e2e.test`](../../backend/.env.e2e.test).

On Linux, ports **1–1023** are *privileged*: only root (or a process with `CAP_NET_BIND_SERVICE`) may bind them. GitHub Actions runners execute as an unprivileged user. Starting the backend on `:1000` there fails with `EACCES` (`listen` permission denied) — the process may log “Server listening” but nothing accepts TCP connections, and health checks get **connection refused**.

Port **3000** is above the privileged range, so the same `node dist/src/main.js` entrypoint works on CI without special capabilities. Docker and VPS deploys keep the default **`PORT` unset → 1000** in [`backend/src/config`](../backend/src/config); only the committed E2E env overrides it.

Do **not** change E2E back to `:1000` unless CI runs the backend as root or inside a container that already maps `:1000`.

| Context | Backend port | Why |
|---------|--------------|-----|
| Docker dev / prod | `1000` | Internal service port; container or deploy env controls bind permissions |
| E2E (local + CI) | `3000` | Host-process backend on unprivileged port; matches Playwright `VITE_BACKEND_URL` / `E2E_BACKEND_URL` |

| Command | Script | When |
|---------|--------|------|
| `npm run start:e2e` | [`start-with-env-e2e.cjs`](../../backend/scripts/start-with-env-e2e.cjs) | **Local** — `ts-node-dev`, no build step |
| `npm run start:e2e:built` | [`start-with-env-e2e-built.cjs`](../../backend/scripts/start-with-env-e2e-built.cjs) | **CI** — `node dist/src/main.js` (prod entrypoint); run `npm run build` first |

**Mongo:** use [`docker-compose.e2e.yml`](../../docker-compose.e2e.yml) for mongo-only (CI and local E2E). It avoids `backend/.env.dev`, which is gitignored and required by `docker-compose.dev.yml` when Compose parses the full dev stack.

**CI orchestration:** [`.github/scripts/start-e2e-backend.sh`](../../.github/scripts/start-e2e-backend.sh) starts `start:e2e:built` in the background and waits for `http://127.0.0.1:3000/api/docs/openapi` (port from `.env.e2e.test`). Mongo readiness is handled by `docker compose ... up -d mongo --wait` in the workflow.

### Shell UI (sidebar, top bar, avatar, theme)

These are **not** covered by E2E. They are validated by frontend unit tests:

- `frontend/src/components/layout/sidebar/Sidebar.test.tsx` — nav links, active route
- `frontend/src/components/layout/topBar/TobBar.test.tsx` — sidebar toggle
- Avatar and theme toggle — covered alongside layout components in unit tests

E2E focuses on cross-page auth and session flows; shell behavior is cheaper and more reliable to test in Vitest.

---

## Directory layout

```txt
tests/e2e/
  spec/
    auth/         # login, logout, session, protected routes
    smoke/        # startup and critical-path health checks
  fixtures/       # extended test fixtures (e.g. loginPage, testUser)
  helpers/        # E2E-only utilities (API setup)
  pages/          # Page Object Models
playwright.config.ts
```

| Layer | Purpose |
|---|---|
| `smoke/` | Fast checks that the app loads — no backend dependency |
| `auth/` | Full auth flows — see [auth-e2e-contract.md](../business-requirements/auth-e2e-contract.md) |
| `pages/` | Encapsulate locators and navigation for a screen |
| `fixtures/` | Shared Playwright test extensions |
| `helpers/` | Test-only helpers not tied to a single page |

---

## Conventions

### Selectors

Prefer accessible locators:

```ts
page.getByRole('heading', { name: 'Login' })
page.getByLabel('Email')
page.getByText('Sign in to your account.')
```

Avoid fragile CSS chains, `nth-child`, and deep DOM selectors.

### Stability

- Use Playwright auto-waiting and `await expect(locator).toBeVisible()`
- Do not use `waitForTimeout()`
- Smoke tests should not depend on external APIs when avoidable (e.g. test `/login` instead of `/`, which triggers token refresh)

### Routes

Import route paths from the frontend config module directly — not the full app config barrel (which pulls in Vite env):

```ts
import { routes } from '../../../frontend/src/config/routes.config';
```

### Page Objects and fixtures

**Smoke** — [`fixtures/base.ts`](../../tests/e2e/fixtures/base.ts) extends Playwright with `loginPage`:

```ts
import { routes } from '../../../../frontend/src/config/routes.config';

import { test } from '../../fixtures/base';
import { expect } from '@playwright/test';

test('[SMK-001] login page loads and primary UI is visible', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
});
```

**Auth** — [`fixtures/authenticated.ts`](../../tests/e2e/fixtures/authenticated.ts) adds `testUser` (registered via API before each test):

```ts
import { routes } from '../../../../frontend/src/config/routes.config';
import { expect } from '@playwright/test';

import { test } from '../../fixtures/authenticated';
import { HomePage } from '../../pages/home.page';

test('[AUTH-E2E-001] successful login redirects to home', async ({ page, loginPage, testUser }) => {
    const homePage = new HomePage(page);

    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    await expect(page).toHaveURL(routes.root);
    await expect(homePage.heading).toBeVisible();
});
```

Page objects live under [`tests/e2e/pages/`](../../tests/e2e/pages/) (e.g. [`login.page.ts`](../../tests/e2e/pages/login.page.ts), [`dashboard.page.ts`](../../tests/e2e/pages/dashboard.page.ts)).

---

## Separation from other test tooling

| Tool | Location | Purpose |
|---|---|---|
| Vitest | `frontend/`, `backend/` | Unit and integration tests |
| Playwright (scraping) | `backend/` (`playwright` package) | Job portal browser automation |
| Playwright Test | repo root (`@playwright/test`) | Frontend E2E browser tests |

Do not reuse backend Playwright config or browser install paths for E2E.

---

## CI

E2E runs on pushes to `main` via [`.github/workflows/reusable-e2e-tests.yml`](../../.github/workflows/reusable-e2e-tests.yml), called from [`main-deploy.yml`](../../.github/workflows/main-deploy.yml) before production deploy.

The workflow:

1. Starts MongoDB via [`docker-compose.e2e.yml`](../../docker-compose.e2e.yml) (`docker compose up -d mongo --wait`)
2. Installs root, frontend, and backend dependencies
3. Builds the backend (`npm run build`) and starts it with [`.env.e2e.test`](../../backend/.env.e2e.test) via [`start-e2e-backend.sh`](../../.github/scripts/start-e2e-backend.sh) (`start:e2e:built` → `node dist/src/main.js` on `0.0.0.0:3000`)
4. Installs Playwright browsers with `--with-deps`
5. Runs `npm run test:e2e` with `CI=true` — smoke + auth must pass
6. Stops the backend ([`stop-e2e-backend.sh`](../../.github/scripts/stop-e2e-backend.sh)) and uploads HTML report, test artifacts, and backend log

Push and PR workflows intentionally skip E2E for speed — see [`docs/requirements/ci-cd.md`](../requirements/ci-cd.md).

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `No tests found` | Run from repo root, not `frontend/` |
| Auth login/session tests fail; smoke passes | Stop Docker dev frontend (`docker compose -f docker-compose.dev.yml stop frontend`) and any Vite on `:5173`. Ensure backend is `npm run start:e2e` on `:3000`. See [Local full stack](#local-full-stack-auth-tests) |
| Dev server port in use | Stop Docker frontend and other Vite instances on `5173`. With `CI=true`, Playwright always starts a fresh server (`reuseExistingServer: false`) |
| `CI=true` locally on macOS | WebKit runs in GitHub Actions only on Linux. Locally use `CI=true npm run test:e2e -- --project=chromium --project=firefox` |
| Backend health check fails in CI | Download the `backend-e2e-log` artifact. If the log shows `EACCES` on `listen` port `1000`, E2E is using the wrong port — see [Why port 3000 for E2E](#why-port-3000-for-e2e-not-1000). Confirm `curl -sf http://127.0.0.1:3000/api/docs/openapi` |
| Frontend module not found | Run `npm ci` in `frontend/` |
