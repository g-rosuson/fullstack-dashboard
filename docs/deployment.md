# Deployment

## Overview

The production stack is self-hosted via Docker Compose. There is no CI/CD pipeline currently — images are built on the server from the cloned repository. When a pipeline is added, the build step moves to CI and the server only pulls pre-built images.

---

## First deployment

### 1. Clone the repo on the server

```bash
git clone <repo-url>
cd <project-dir>
```

### 2. Create the root `.env` file

This file is never committed. It holds the MongoDB root credentials used by Docker Compose variable substitution.

```bash
# Create at repo root
cat > .env << EOF
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-strong-password-here
EOF
```

### 3. Configure `backend/.env.prod`

Fill in real values for all placeholder fields:

| Variable | What to change |
|---|---|
| `ACCESS_TOKEN_SECRET` | Replace `REPLACE_WITH_STRONG_SECRET` with a random 64-char hex string |
| `REFRESH_TOKEN_SECRET` | Same — must be different from access token secret |
| `MONGO_URI` | Replace the password to match `MONGO_ROOT_PASSWORD` in `.env` |
| `PROD_CLIENT_URL` | Your frontend domain |
| `PROD_DOMAIN` | Your domain (used for cookie settings) |

Generate strong secrets with:
```bash
openssl rand -hex 64
```

### 4. Configure `docker-compose.prod.yml`

Update `VITE_BACKEND_URL` to your actual backend URL:

```yaml
args:
  - VITE_BACKEND_URL=https://api.yourdomain.com
```

This value is baked into the frontend bundle at build time. Changing it requires a rebuild.

### 5. Start the stack

```bash
npm run start:prod
```

On first run, the script detects no existing volume and builds the images automatically. This will take several minutes due to the Playwright base image (~1.5GB).

---

## Subsequent deployments

After pulling new code:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The `--build` flag rebuilds images with the new code. Existing data volumes are untouched.

Do not use `npm run start:prod` for updates — it skips `--build` when the volume already exists.

---

## Environment files

| File | Committed | Purpose |
|---|---|---|
| `backend/.env.dev` | No | Dev environment variables |
| `backend/.env.prod` | No | Prod environment variables |
| `.env` (repo root) | No | MongoDB credentials for Docker Compose variable substitution (prod only) |

None of these files are committed to the repository. They must be created manually on each machine/server.

The `backend/.env.dev` file is safe for local use — it contains no production secrets and points to the local Docker MongoDB instance.

---

## Monitoring

View live logs from all services:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

View logs for a specific service:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
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

# Restart
docker compose -f docker-compose.prod.yml up -d

# Wipe everything including database — DESTRUCTIVE
npm run reset:prod
```

`reset:prod` prompts for confirmation before running. It is intended for decommissioning, not routine restarts.
