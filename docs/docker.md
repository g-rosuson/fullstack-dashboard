# Docker

## Architecture

The stack runs as three isolated containers. Each has a single responsibility and communicates over Docker's internal network.

```
Browser
  ├── localhost:5173  →  frontend  (Vite dev / Nginx prod)
  └── localhost:1000  →  backend   (Express API)
                              └── mongo:27017  →  mongo (MongoDB)
```

The frontend and backend are on separate ports — there is no reverse proxy between them. The frontend knows the backend URL via the `VITE_BACKEND_URL` environment variable, which is set in each compose file.

MongoDB is not exposed to the host in production. It is only reachable from within the Docker network via the `mongo` hostname.

---

## Dev vs prod

| Concern | Dev | Prod |
|---|---|---|
| Frontend | Vite dev server, HMR enabled | Nginx serving static build |
| Backend | `ts-node-dev` with hot reload | Compiled Node (`dist/main.js`) |
| Code changes | Live — no rebuild needed | Requires image rebuild |
| Source mounting | Yes — host files mounted into containers | No — code is baked into image |

In dev, the source directories (`frontend/src/`, `backend/src/`) are mounted as volumes into the running containers. Vite and `ts-node-dev` watch for file changes and reload automatically. You edit in Cursor, changes appear immediately.

In prod, source is compiled and baked into the image at build time. A code change requires rebuilding the image.

---

## File watching on macOS

Docker Desktop on macOS does not propagate filesystem events reliably across the VM boundary. Without polling, Vite and `ts-node-dev` would not detect file changes.

Both containers have `CHOKIDAR_USEPOLLING=true` set, which switches file watching from event-based to polling. This adds a small CPU overhead but ensures hot reload works correctly.

The HMR websocket is also explicitly configured in `frontend/vite.config.mts`:

```ts
server: {
  host: '0.0.0.0',    // listen on all interfaces inside the container
  port: 5173,
  hmr: {
    host: 'localhost', // tell the browser where to connect for HMR
    port: 5173,
  },
}
```

Without the explicit `hmr` block, Vite can resolve the wrong host for the websocket connection and HMR silently fails.

---

## Backend image

The backend uses `mcr.microsoft.com/playwright:v1.57.0-noble` (Ubuntu 24.04) as its base image for all stages.

**Why Playwright and not Alpine or plain Node?**

The backend uses Playwright/Crawlee for browser-based scraping, which requires Chromium and its system dependencies (libnss, libatk, libgbm, etc.). The Playwright image ships with all of these pre-installed and is versioned to match the Playwright npm package.

Alpine was ruled out for two reasons:
1. Alpine uses musl libc. The backend includes `bcrypt`, a native Node module that compiles against the system libc. A binary compiled on Alpine (musl) will not run on Debian (glibc) — they are incompatible. Since the Playwright image is Debian-based, all stages must also be Debian-based.
2. Playwright's browser dependencies do not install cleanly on Alpine.

**Image size:** ~1.5GB. This is the cost of bundling a browser runtime and is unavoidable.

**Keeping it in sync with the npm package:**

The `playwright` package in `backend/package.json` is pinned to an exact version (no `^` or `~`). The image tag in `backend/Dockerfile` must always match it exactly:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS deps
```

```json
"playwright": "1.59.1"
```

When upgrading, update both in lockstep. A mismatch causes a hard `BrowserLaunchError` — Playwright resolves a browser binary path based on the npm package version, and if the image only has binaries for a different version, the executable simply does not exist. Playwright will print the exact versions in the error message to help diagnose it.

---

## Compose files

| File | Purpose |
|---|---|
| `docker-compose.dev.yml` | Local development |
| `docker-compose.prod.yml` | Production deployment |

Each compose file has a `name:` field at the top (`nameless-dashboard-dev` / `nameless-dashboard-prod`). This ensures Docker Compose uses a deterministic project name regardless of which directory the repo is cloned into — which matters for volume naming and service identification.

---

## Volumes

Each environment has its own named volume for MongoDB data:

- `nameless-dashboard-dev_mongo_dev_data`
- `nameless-dashboard-prod_mongo_prod_data`

Data persists across `docker compose down` and `docker compose up` cycles. It is only deleted when you explicitly run `docker compose down -v`.

**Never run `docker compose down -v` in production** — it permanently deletes the database.
