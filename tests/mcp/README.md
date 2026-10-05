# MCP exposure tests

Who can reach the MCP server in the dev and prod Compose stacks. The application can call it. The public internet cannot.

`mcp-backend` tests its own protocol, tool catalog, and host allowlist. This suite only checks placement in Docker.

Scenarios: [docs/specs/architecture/http/mcp/exposure.md](../../docs/specs/architecture/http/mcp/exposure.md).

## Run

Docker has to be running. From the repo root:

```bash
npm run test:mcp
```

The first run builds the backend image, so it takes a while. Prod starts Caddy, so host ports 80 and 443 need to be free.

The suite starts two projects, `mcp-exposure-dev` and `mcp-exposure-prod`, then removes them.

On push to `main`, the same command runs in GitHub Actions beside the Playwright job. Deploy waits for both. Pull requests do not run it.

## What each test does

**Application call, dev and prod.** A backend container posts a `tools/list` request to `http://mcp-server:3000/mcp`. The answer is HTTP 200 and one JSON-RPC result. That container is on the private network, and the MCP server is only on that network.

**Public internet, dev and prod.** The MCP server publishes no port on the host. Another container, on the dev default network or the prod web network, tries the same URL and cannot connect. Caddy and the rest of the app use those networks. The MCP hostname is not on them.

**Public hosts, prod only.** From this machine, curl posts to `http://127.0.0.1/mcp` with `Host: dashboard.rosuson.com` and `Host: api.rosuson.com`. Neither body is an MCP result. Caddy is running. The frontend and backend containers are not.

## Why some requests run inside Docker

This test file runs on your machine. `mcp-server` is a Docker DNS name on the private network, and that service publishes no host port, so a normal fetch from here has nowhere to go.

The application call has to start in the backend container, because that container is on the private network. The public-internet check has to start on the other network, where the name does not exist. Docker starts Node in the right place, the script prints one line of JSON, and the test reads it.

The public-host check is a normal curl from this machine, because Caddy is listening on port 80.

## Files

- `exposure.test.mjs` is the suite.
- `compose.override.yml` clears the backend env file so Compose can start without `backend/.env.dev` or `backend/.env.prod`. Networks stay as they are in the Compose files.
- `docker-compose.dev.yml` and `docker-compose.prod.yml` are the stacks under test.

## Setup and cleanup

Before the tests, both projects start `mcp-server` and wait until it is healthy. Prod also starts Caddy. Dev briefly starts a backend container and deletes it, only so the default network exists for the public-internet check.

After the tests, both projects are shut down and their volumes are removed. If one shutdown fails, the other still runs.
