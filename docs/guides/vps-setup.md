# VPS Setup Guide

Step-by-step guide for provisioning a fresh Hetzner server and deploying the production stack for the first time. This guide assumes DNS A records for the frontend domain and API domain are already pointing to the server's IP.

---

## Prerequisites

- A Hetzner Cloud account
- DNS A records for the frontend domain and API domain set to the server IP (no AAAA/IPv6 records — these interfere with Let's Encrypt's HTTP-01 challenge)
- SSH key pair on your local machine (`~/.ssh/id_ed25519` or similar)

---

## 1. Create the Server on Hetzner

1. Log in to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Click **New Server** and configure:

| Setting | Value |
|---|---|
| **Location** | Any (choose closest to your users) |
| **Image** | Ubuntu 24.04 |
| **Type** | Shared CPU — **CX22** (2 vCPU, 4 GB RAM) minimum; upgrade if traffic grows |
| **Networking** | Public IPv4 enabled; disable IPv6 (prevents Let's Encrypt conflicts if your DNS provider has AAAA records pointing elsewhere) |
| **SSH keys** | Add your local public key so you can log in immediately as `root` |
| **Firewall** | None — UFW is configured on the OS directly |
| **Name** | Something descriptive, e.g. `prod-server-1` |

3. Click **Create & Buy**. Note the server's public IPv4 address.

---

## 2. Initial Login as Root

```bash
ssh root@<server-ip>
```

Verify you are in as root:

```bash
whoami
# root
```

---

## 3. Create the `deploy` User

All application operations run as a non-root `deploy` user.

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Set a password for the `deploy` user (needed for `sudo`):

```bash
passwd deploy
```

Verify you can SSH in as `deploy` before continuing:

```bash
# From your local machine
ssh deploy@<server-ip>
```

---

## 4. Configure the Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

Expected output:

```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Port `1000` (backend) is intentionally **not** exposed — traffic goes through Caddy only.

---

## 5. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Add `deploy` to the `docker` group so it can run Docker without `sudo`:

```bash
sudo usermod -aG docker deploy
```

Log out and back in for the group change to take effect:

```bash
exit
ssh deploy@<server-ip>
```

Verify Docker works:

```bash
docker run hello-world
```

---

## 6. Clone the Repository

```bash
mkdir ~/app
cd ~/app
git clone <repo-url> .
```

---

## 7. Generate the MongoDB Keyfile

MongoDB requires a keyfile for replica set authentication when `--auth` is enabled. The file must be owned by the MongoDB user (UID `999` inside the container).

```bash
openssl rand -base64 756 > ~/app/mongo-keyfile
chmod 400 ~/app/mongo-keyfile
sudo chown 999:999 ~/app/mongo-keyfile
```

---

## 8. Create the Root `.env` File

This file holds the MongoDB root credentials used by Docker Compose variable substitution. It is never committed to the repo.

Generate a strong hex password. **Hex is required** — special characters in the password must be URL-encoded in `MONGO_URI`, and encoding mistakes cause silent connection failures. A hex string is safe to paste directly into a URI without any encoding.

```bash
openssl rand -hex 24
```

Create the file:

```bash
cat > ~/app/.env << 'EOF'
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=<paste generated hex password here>
EOF
```

---

## 9. Create `backend/.env.prod`

Generate two independent secrets for JWT signing:

```bash
openssl rand -hex 64  # for ACCESS_TOKEN_SECRET
openssl rand -hex 64  # for REFRESH_TOKEN_SECRET
```

Create the file, using the **same password** as `MONGO_ROOT_PASSWORD` in step 8. MCP prompts call OpenRouter ([ADR-0001](../specs/architecture/adr/0001-openrouter-mcp.md)); set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in this file and in `backend/.env.dev`.

```bash
cat > ~/app/backend/.env.prod << 'EOF'
NODE_ENV=production
DEV_CLIENT_URL=http://localhost:5173
PROD_CLIENT_URL=https://<your-frontend-domain>
PROD_DOMAIN=<your-root-domain>
DEV_DOMAIN=localhost
ACCESS_TOKEN_SECRET=<64-char hex secret>
REFRESH_TOKEN_SECRET=<64-char hex secret, different from above>
MONGO_URI=mongodb://admin:<MONGO_ROOT_PASSWORD>@mongo:27017/?replicaSet=rs0&authSource=admin
MONGO_DB_NAME=nameless-db-prod
MONGO_USER_COLLECTION_NAME=users
MONGO_JOBS_COLLECTION_NAME=jobs
MAX_DB_RETRIES=3
DB_RETRY_DELAY_MS=5000
ENABLE_HTTP_RATE_LIMIT=true
ENABLE_LOGGING=false
ENABLE_REGISTRATION=false
OPENROUTER_API_KEY=<openrouter api key>
OPENROUTER_MODEL=<openrouter model id>
EOF
```

> The password in `MONGO_URI` must exactly match `MONGO_ROOT_PASSWORD` in `.env`. Always use a hex-only password — special characters in a URI (e.g. `#`, `@`, `$`) break URL parsing and cause the backend to fail at startup with a schema validation error.

---

## 10. Start the Stack

```bash
cd ~/app
docker compose -f docker-compose.prod.yml up -d --build
```

This will:
- Build the frontend image (Vite build with `VITE_BACKEND_URL` baked in)
- Build the backend image (TypeScript compilation)
- Pull `mongo:7` and `caddy:2-alpine`
- Start all four containers
- Caddy will automatically obtain TLS certificates from Let's Encrypt for both domains

The first build takes several minutes due to the Playwright base image (~1.5 GB).

---

## 11. Configure GitHub Actions CD Pipeline

The deploy workflow (`.github/workflows/main-deploy.yml`) SSHes into the server on every push to `main` and runs `git pull` + `docker compose up --build`. It requires a dedicated SSH key pair and four repository secrets.

### Step 1 — Generate the deploy key (local machine)

Run this on your **local machine**, not the server:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/hetzner_deploy
# Press Enter twice for no passphrase
```

This creates two files:
- `~/.ssh/hetzner_deploy` — private key (goes into GitHub secrets)
- `~/.ssh/hetzner_deploy.pub` — public key (goes onto the server)

Print the public key so you can copy it:

```bash
cat ~/.ssh/hetzner_deploy.pub
```

### Step 2 — Authorise the key on the server

SSH into the server:

```bash
ssh deploy@<server-ip>
```

Append the public key to the authorised keys file:

```bash
echo "paste-the-public-key-here" >> ~/.ssh/authorized_keys
```

Verify it was added:

```bash
cat ~/.ssh/authorized_keys
# Should show both your personal key and the new deploy key
```

Exit the server:

```bash
exit
```

### Step 3 — Test the key works

Before adding to GitHub, verify the key authenticates correctly from your local machine:

```bash
ssh -i ~/.ssh/hetzner_deploy deploy@<server-ip> "echo connection OK"
```

You should see `connection OK` with no password prompt. If it fails, check that the public key was appended correctly in step 2.

### Step 4 — Copy the private key

Print the full private key content — you will paste this into GitHub:

```bash
cat ~/.ssh/hetzner_deploy
```

Copy everything including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

### Step 5 — Add secrets to GitHub

1. Go to the repository on GitHub
2. Click the **Settings** tab
3. In the left sidebar under **Security**, click **Secrets and variables** → **Actions**
4. Click the **Secrets** tab
5. Click **New repository secret** and add all four secrets:

| Secret name | Value |
|---|---|
| `HETZNER_HOST` | Server public IP address (e.g. `178.x.x.x`) |
| `HETZNER_USER` | `deploy` |
| `HETZNER_SSH_PRIVATE_KEY` | Full private key from step 4 |
| `HETZNER_REPO_PATH` | `/home/deploy/app` |

### Step 6 — Verify the pipeline

Push a commit to a branch, open a PR against `main`, and merge it. Then:

1. Go to the repository on GitHub → **Actions** tab
2. Find the `Deploy to production` workflow run
3. Confirm it completes with a green checkmark
4. SSH into the server and confirm containers are still healthy:

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## 12. Verify

Check all containers are running and healthy:

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected state:

```
NAME          SERVICE    STATUS           PORTS
...-caddy-1   caddy      Up               0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
...-frontend  frontend   Up               80/tcp
...-backend   backend    Up               1000/tcp
...-mongo-1   mongo      Up (healthy)     27017/tcp
```

Watch Caddy obtain TLS certificates (takes ~10 seconds on first start):

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

Look for:

```json
{"level":"info","msg":"certificate obtained successfully","identifier":"<your-frontend-domain>"}
{"level":"info","msg":"certificate obtained successfully","identifier":"<your-api-domain>"}
```

Test the API is reachable:

```bash
curl https://<your-api-domain>/health
```

Open `https://<your-frontend-domain>` in a browser and confirm the app loads.

---

## Troubleshooting

### Caddy fails to obtain certificates

The most common cause is a DNS conflict. Check:

```bash
nslookup <your-frontend-domain>
```

If the output shows an IPv6 address alongside the server IPv4, remove the AAAA record from your DNS provider. Let's Encrypt prefers IPv6 and will reach the DNS provider's servers instead of your Hetzner server, causing the challenge to fail.

After removing AAAA records, restart Caddy:

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

### Backend container fails to start

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs backend
```

Common causes:
- **`MONGO_URI` password mismatch** — the password in `backend/.env.prod` does not match the one MongoDB was initialised with. Fix: wipe the volume and restart with matching credentials: `docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d --build`
- **MongoDB keyfile permissions** — the keyfile must be owned by UID `999`. Run `sudo chown 999:999 ~/app/mongo-keyfile`

### CORS errors in the browser

`PROD_CLIENT_URL` in `backend/.env.prod` does not match the origin the browser is sending. Verify the value matches your frontend domain exactly with no trailing slash (e.g. `https://yourdomain.com`), then restart the backend:

```bash
docker compose -f docker-compose.prod.yml restart backend
```
