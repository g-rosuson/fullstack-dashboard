# TKT-DEPLOY-001 — Sync production env from GitHub secrets

`chore/tkt-deploy-001-prod-env-secrets`

Labels: `chore`

## User story

As an operator, I want each production deploy to write env files from GitHub Actions secrets so that a new property ships with the merge.

## Definition of done

- [ ] Implement [Sync production env from GitHub secrets](/Users/ghr/.cursor/plans/deploy_env_secrets_b9b57a10.plan.md)
- [ ] `.github/scripts/write-prod-env.sh` decodes `BACKEND_ENV_PROD_B64` into `backend/.env.prod` and `ROOT_ENV_B64` into `.env`, mode `600`
- [ ] The script requires `MCP_ENV_B64`, writes `mcp-backend/.env`, and restores the on-disk `FPL_REFRESH_TOKEN` ([`mcp-backend/src/modules/fpl/client/session.ts`](../../../mcp-backend/src/modules/fpl/client/session.ts) rewrites that line)
- [ ] The script exits non-zero when a required secret is missing or `base64 -d` fails
- [ ] [`.github/workflows/main-deploy.yml`](../../../.github/workflows/main-deploy.yml) forwards the three secrets and runs the script after `git reset --hard` and before `docker compose up`
- [ ] [docs/artifacts/deployment.md](../../artifacts/deployment.md) and [docs/guides/vps-setup.md](../../guides/vps-setup.md) document the secrets, the write step, `base64 -w 0`, and the update path (edit the secret, merge to `main`)

## Traces

None — deploy plumbing; no product FR.
