# Deployment

## Overview

The production stack is self-hosted via Docker Compose on a Hetzner VPS. Deployments are automated — every push to `main` triggers the GitHub Actions workflow (`.github/workflows/main-deploy.yml`), which SSHes into the server, pulls the latest code, and rebuilds the containers.

For first-time server provisioning, see the [VPS Setup Guide](../guides/vps-setup.md).

---

## How deploys work

1. A PR is opened targeting `main`
2. The PR validation workflow runs unit + integration tests as a merge gate
3. On merge, the deploy workflow triggers automatically:
   - `git fetch origin main` + `git reset --hard origin/main` — syncs the server to the exact merged commit
   - `.github/scripts/write-prod-env.sh` — writes production env files from GitHub Actions secrets
   - `docker compose -f docker-compose.prod.yml up -d --build` — rebuilds changed images and restarts affected containers

Routine deploys run from the merge. A new env property is a secret update plus a merge to `main`.

---

## Production stack

Four containers run in the `web` Docker network:

```
Internet
  └── Caddy (:80, :443)
        ├── dashboard.<domain>  →  frontend (nginx, :80 internal)
        └── api.<domain>        →  backend  (Express, :1000 internal)
                                        └── mongo:27017  →  mongo (MongoDB)
```

- **Caddy** is the only container with public ports. It terminates TLS and reverse-proxies to the other services by Docker service name.
- **Frontend and backend** use `expose` (internal only) — they are not directly reachable from the internet.
- **MongoDB** is never exposed outside the Docker network.

---

## Environment files

| File | Committed | Source |
|---|---|---|
| `backend/.env.dev` | No | Created locally for dev |
| `backend/.env.prod` | No | Secret `BACKEND_ENV_PROD_B64`; deploy writes it |
| `.env` (repo root) | No | Secret `ROOT_ENV_B64`; MongoDB credentials for Compose variable substitution |
| `mcp-backend/.env` | No | Secret `MCP_ENV_B64`; deploy writes it and keeps the on-server `FPL_REFRESH_TOKEN` |
| `~/mongo-keyfile` (server) | No | Created on the server at `$HOME/mongo-keyfile` |

None of these files are committed. Create `backend/.env.prod` and the root `.env` on the server once so the first manual Compose start can run ([VPS Setup Guide](../guides/vps-setup.md) steps 8–9). After the secrets exist, each deploy decodes them with `.github/scripts/write-prod-env.sh` and writes the files mode `600` before Compose starts.

Encode a file on the server with `base64 -w 0 <file>` and paste the single line into the secret. To add or change a property, update that secret and merge to `main`.

The script writes `mcp-backend/.env` from `MCP_ENV_B64` and keeps the `FPL_REFRESH_TOKEN` already on the server. The MCP process rotates that value in place.

Set **`ENABLE_REGISTRATION=false`** in `backend/.env.prod` to block public sign-up (`POST /api/auth/register` returns 403). Seed the first user via `curl` while the flag is still `true`, or insert into Mongo after lockdown (see [VPS Setup Guide](../guides/vps-setup.md)).

---

## Monitoring

View live logs from all services:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

View logs for a specific service:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f mongo
```

Check container health:

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Stopping and restarting

```bash
# Stop without removing data
docker compose -f docker-compose.prod.yml down

# Restart without rebuild
docker compose -f docker-compose.prod.yml up -d

# Rebuild and restart (after code changes deployed manually)
docker compose -f docker-compose.prod.yml up -d --build

# Wipe everything including database — DESTRUCTIVE
npm run reset:prod
```

`reset:prod` prompts for confirmation before running. It is intended for decommissioning, not routine restarts.

---

## TLS certificates

Caddy automatically obtains and renews Let's Encrypt certificates for all domains defined in `Caddyfile`. Certificates are stored in the `caddy_data` named Docker volume and persist across container restarts.

No manual certificate management is needed.

If certificates fail to renew, check Caddy logs:

```bash
docker compose -f docker-compose.prod.yml logs caddy | grep -i "tls\|cert\|error"
```
