/**
 * Fantasy Premier League JSON API. Public reads need no token.
 */
const API_ORIGIN = "https://fantasy.premierleague.com/api";

/**
 * PingOne token endpoint for the Fantasy Premier League web app.
 * Public client: the exchange sends client_id and the refresh token, no secret.
 */
const TOKEN_URL = "https://account.premierleague.com/as/token";

/**
 * OIDC client id on the refresh token copied from the fantasy site (`aud` / `client_id`).
 */
const OIDC_CLIENT_ID = "bfcbaf69-aade-4c1b-8f00-c1cb8a193030";

const USER_AGENT = "mcp-server/0.1";

/**
 * Refresh this long before `expires_in` so a call does not race the clock.
 * Capped at half the lifetime when PingOne returns a shorter token.
 */
const ACCESS_TOKEN_SKEW_MS = 15_000;

export { ACCESS_TOKEN_SKEW_MS, API_ORIGIN, OIDC_CLIENT_ID, TOKEN_URL, USER_AGENT };
