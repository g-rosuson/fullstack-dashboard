# FPL authentication

How this module authenticates to Fantasy Premier League. Caller login (Cursor, a gateway, JWT) is separate and is not handled here.

FPL login is PingOne OIDC. Email/password and the old `users.premierleague.com` cookie login do not work. The module never logs anyone in.

## What needs a token

Public reads (gameweek, players, fixtures, manager, picks, live, league) need no refresh token ([FR-FPL-ACC-001](../../../docs/specs/requirements/fr/fpl/access.md)).

The squad tool needs both:

- `FPL_REFRESH_TOKEN` — the PingOne `refresh_token`
- `FPL_ENTRY_ID` — the number in `fantasy.premierleague.com/entry/<id>/`

A squad call with either value missing is a tool error ([FR-FPL-SQD-004](../../../docs/specs/requirements/fr/fpl/squad.md)). Both stay out of the platform env schema. Put them in the process `.env`.

## Setup

1. Copy `.env.example` to `.env` (gitignored).
2. Log in at [fantasy.premierleague.com](https://fantasy.premierleague.com).
3. Copy the refresh token from the browser (below).
4. Set `FPL_REFRESH_TOKEN` and `FPL_ENTRY_ID` in `.env`.
5. Start the server.

On `https://fantasy.premierleague.com`, open DevTools (F12) → Console:

```js
copy(JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("oidc.user:")))).refresh_token);
```

If Chrome blocks the paste, type `allow pasting` first.
git 
Alternatively: Application → Local storage → `https://fantasy.premierleague.com` → key starting with `oidc.user:` → copy `refresh_token`.

Do not store only the access token. It lasts about an hour.

## Active session

The Fantasy site and this process cannot share one refresh token. Each use burns it, and PingOne issues a new one. A tab left open refreshes first, so the copy in `.env` is rejected.

Copy `refresh_token` from the `oidc.user:` entry, then close every Fantasy tab before the site refreshes again. Put that value in `FPL_REFRESH_TOKEN` and restart the server. A running process does not reload `.env`.

The first successful squad call spends the pasted token. The server writes the replacement into `.env`, and the value still in the browser no longer works. Later squad calls use the saved replacement. Signing in on the website again requires a new copy.

## Exchange

On a squad call the module posts that refresh token to `https://account.premierleague.com/as/token` with `grant_type=refresh_token` and client id `bfcbaf69-aade-4c1b-8f00-c1cb8a193030`. It caches the access token for about an hour, then calls `GET /api/my-team/{FPL_ENTRY_ID}/` with `X-API-Authorization: Bearer <access_token>`.

PingOne returns a new refresh token and kills the old one. The module keeps the new one in memory and rewrites `FPL_REFRESH_TOKEN` in `.env` before the next exchange, so a later squad call in the same process still works ([FR-FPL-SQD-005](../../../docs/specs/requirements/fr/fpl/squad.md)). A 401 or 403 drops the access token, exchanges once, and retries once. If that exchange fails, the operator pastes a new refresh token from the browser.
