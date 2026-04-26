# Database

## Overview

Both environments run a self-hosted MongoDB 7 instance in a Docker container. Data is stored in a named Docker volume on the host machine.

This replaced MongoDB Atlas, which was the original setup. The switch was made to achieve full environment isolation — dev and prod each have their own contained database with no shared state and no external dependency.

---

## Replica set

MongoDB is configured as a single-node replica set (`--replSet rs0`) in both environments.

**Why a replica set for a single instance?**

MongoDB transactions — used in this app for atomic job creation — require the oplog (operations log). The oplog only exists on replica set members. A standalone MongoDB instance has no oplog and will reject any transaction with:

```
Transaction numbers are only allowed on a replica set member or mongos
```

A single-node replica set gives us the oplog without the complexity of a multi-node cluster.

**Automatic initialisation:**

The replica set is initialised automatically via the MongoDB healthcheck in the compose files:

```yaml
healthcheck:
  test: |
    mongosh --eval "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo:27017' }] }).ok }"
```

On first boot, `rs.status()` throws because the replica set does not exist yet. The `catch` block calls `rs.initiate()`. On subsequent boots the `try` succeeds and `rs.initiate()` is never called. No manual setup is needed.

The member host is `mongo:27017` — the Docker service name — not `localhost`. Using `localhost` here would cause the replica set to report a primary on a host that the backend driver cannot reach, breaking all replica set-aware connections.

The backend waits for the healthcheck to pass before starting:

```yaml
backend:
  depends_on:
    mongo:
      condition: service_healthy
```

---

## Authentication (production only)

Production MongoDB runs with `--auth`, requiring credentials for all connections. Dev MongoDB has no authentication — it is only reachable within the Docker network and never exposed to the internet.

**How credentials are provisioned:**

On a fresh deployment (empty volume), the official `mongo:7` image reads `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` at first boot and creates the root user automatically. These variables are injected from the root `.env` file via Docker Compose variable substitution.

The backend connects with credentials via `MONGO_URI` in `backend/.env.prod`:

```
mongodb://admin:PASSWORD@mongo:27017/?replicaSet=rs0&authSource=admin
```

`authSource=admin` tells the MongoDB driver to authenticate against the `admin` database, where the root user lives.

**Enabling auth on an existing deployment:**

If the volume already exists (auth was never enabled), `MONGO_INITDB_ROOT_*` has no effect. Follow these steps once:

```bash
# 1. Connect to the running container
docker exec -it <container_name> mongosh

# 2. Create the root user
use admin
db.createUser({
  user: "admin",
  pwd: "STRONG_PASSWORD",
  roles: [{ role: "root", db: "admin" }]
})

# 3. Exit, then add --auth to the mongod command in docker-compose.prod.yml
# 4. Restart the mongo service
docker compose -f docker-compose.prod.yml up -d --no-deps mongo
```

---

## Security

This setup is self-managed. The following risks are accepted knowingly:

**No TLS between backend and MongoDB**
Traffic between containers travels over Docker's internal network, unencrypted. This is acceptable for a single-server deployment where both containers are on the same host. If they ever run on separate hosts, TLS must be configured on mongod.

**No automated backups**
Atlas provided managed backups. With a self-hosted volume you must run your own. A minimal approach:

```bash
# Run on a cron, e.g. daily
docker exec <mongo_container> mongodump --out /dump
docker cp <mongo_container>:/dump ./backup-$(date +%Y%m%d)
# Upload to S3/R2/B2 etc.
```

**Keep MongoDB updated**
Periodically update the `mongo:7` image tag in the compose files and check the [MongoDB CVE list](https://www.mongodb.com/docs/manual/administration/security-checklist/).

---

## Resetting the database

To wipe all data and start fresh, use the reset script — it requires typing the environment name to confirm:

```bash
npm run reset:dev
npm run reset:prod   # dangerous in production
```

This runs `docker compose down -v`, which removes all containers and volumes.
