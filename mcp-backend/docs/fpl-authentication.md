# FPL authentication

How a consumer authenticates to Fantasy Premier League when they clone and run this MCP server. Caller login (Cursor, a gateway, JWT) is separate and is not handled here.

FPL login is PingOne OIDC. Email/password and the old `users.premierleague.com` cookie login do not work.

## What needs a token

Public bootstrap data (players, fixtures, gameweeks) needs no FPL auth.

Your squad, transfers, and other private team endpoints need:

- `FPL_REFRESH_TOKEN` — PingOne OIDC refresh token
- `FPL_ENTRY_ID` — your team id (`fantasy.premierleague.com/entry/<id>/`)

## Clone-and-run setup

1. Copy `.env.example` to `.env` (gitignored).
2. Log in at [fantasy.premierleague.com](https://fantasy.premierleague.com).
3. Copy the refresh token from the browser (below).
4. Set `FPL_REFRESH_TOKEN` and `FPL_ENTRY_ID` in `.env`.
5. Start the server.

If Cursor launches the process, put the same variables in that server's `env` block in MCP config.

## Copy the refresh token

On `https://fantasy.premierleague.com`, open DevTools (F12) → Console:

```js
copy(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("oidc.user:")))).refresh_token);
```

If Chrome blocks the paste, type `allow pasting` first.

Alternatively: Application → Local storage → `https://fantasy.premierleague.com` → key starting with `oidc.user:` → copy `refresh_token`.

## How the FPL module uses it

The module exchanges `FPL_REFRESH_TOKEN` for a short-lived access token and calls FPL with:

`X-API-Authorization: Bearer <access_token>`

PingOne often rotates the refresh token on each exchange. Persist the new value back to `.env` so the next restart still works. If FPL returns 401/403, refresh and retry. If the token is revoked, the consumer copies a new one from the browser.

Do not store only the access token. It lasts about an hour.
