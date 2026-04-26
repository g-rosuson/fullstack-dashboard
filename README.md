# Fullstack Authentication System

A full-stack dashboard with JWT authentication and job automation.

The frontend is a React/TypeScript SPA with Zustand for state management. Orval generates a typed API client by consuming the OpenAPI schema served from the backend at `/api/docs/openapi`.

The backend is Express/TypeScript. API schemas are defined with Zod, and `@asteasolutions/zod-to-openapi` generates the OpenAPI spec from those schemas automatically. MongoDB handles persistence, JWT handles authentication, and Crawlee/Playwright handle browser-based job automation.

---

## Tech stack

**Frontend:** React · TypeScript · Vite · Zustand · Orval · SCSS · Vitest

**Backend:** Node.js · Express · TypeScript · Zod · MongoDB · JWT · Crawlee · Playwright

---

## Quick start

Docker Desktop is the only prerequisite — no local Node, npm, or MongoDB required.

```bash
npm run start:dev    # build images (first run only) and start the dev stack
npm run start:prod   # build images (first run only) and start the prod stack
```

| Service | Dev URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:1000 |
| MongoDB | internal only (not exposed in prod) |

In dev, code changes are reflected live — no restart needed. Vite HMR handles the frontend; `ts-node-dev` handles the backend.

See [docs/deployment.md](docs/deployment.md) for the full first-deployment checklist and environment file setup.

---

## Other commands

```bash
npm run reset:dev    # wipe dev database and stop containers (prompts for confirmation)
npm run reset:prod   # wipe prod database and stop containers (prompts for confirmation)

# View logs
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.prod.yml logs -f

# Rebuild after code changes in production
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Documentation

- [docs/docker.md](docs/docker.md) — container architecture, image decisions, HMR setup, volumes
- [docs/database.md](docs/database.md) — replica set, transactions, MongoDB auth, security tradeoffs, backups
- [docs/deployment.md](docs/deployment.md) — first deployment, environment files, secrets, monitoring

---

## License

MIT
