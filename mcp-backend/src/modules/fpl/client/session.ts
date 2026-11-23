import { UpstreamError } from "../../../errors";
import { MISSING_REFRESH_TOKEN, REFRESH_TOKEN_REJECTED, UPSTREAM_NO_ACCESS_TOKEN } from "../constants/messages";
import { replacePlaceholder } from "../helpers";
import { fetchToken } from "./client";
import { ACCESS_TOKEN_SKEW_MS, OIDC_CLIENT_ID } from "./constants";
import { defaultDotenvPath, rewriteEnvFile } from "./helpers";
import { tokenSchema } from "./schemas";

import type { Session } from "./types";

const session: Session = {
    refreshToken: undefined,
    accessToken: undefined,
    accessTokenExpiresAt: 0,
};

/**
 * One in-flight refresh. Concurrent squad calls share it so PingOne rotates once.
 */
let refreshing: Promise<string> | undefined;

/**
 * Drops cached tokens.
 * The next call reads `FPL_REFRESH_TOKEN` from the environment again.
 */
function clearSession(): void {
    session.refreshToken = undefined;
    session.accessToken = undefined;
    session.accessTokenExpiresAt = 0;
    refreshing = undefined;
}

/**
 * Refresh token for this process.
 * After PingOne rotates it, the new value wins over the environment until {@link clearSession}.
 */
function operatorRefreshToken(): string | undefined {
    return session.refreshToken || process.env.FPL_REFRESH_TOKEN?.trim() || undefined;
}

/**
 * Operator team id from `FPL_ENTRY_ID`, or undefined when it is missing or not a positive integer.
 */
function operatorEntryId(): number | undefined {
    const raw = process.env.FPL_ENTRY_ID?.trim();

    if (!raw) {
        return undefined;
    }

    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return undefined;
    }

    return parsed;
}

/**
 * Replaces the `FPL_REFRESH_TOKEN` line in the dotenv file and updates `process.env`.
 * A missing file is ignored: this process already holds the rotated token.
 */
function persistRefreshToken(token: string): void {
    process.env.FPL_REFRESH_TOKEN = token;

    try {
        rewriteEnvFile(defaultDotenvPath(), token);
    } catch {
        // Same-process calls already use session.refreshToken.
    }
}

/**
 * Exchanges the refresh token for an access token.
 * PingOne rotates the refresh token; the new value is kept in memory and written to `.env`.
 * Concurrent callers share one exchange.
 * Throws when no refresh token is configured or the exchange fails.
 */
async function accessToken(): Promise<string> {
    if (session.accessToken && Date.now() < session.accessTokenExpiresAt) {
        return session.accessToken;
    }

    if (!refreshing) {
        refreshing = exchange().finally(() => {
            refreshing = undefined;
        });
    }

    return refreshing;
}

/**
 * Drops the cached access token so the next call exchanges again.
 * Used after Fantasy Premier League rejects a token that has not expired yet.
 */
function dropAccessToken(): void {
    session.accessToken = undefined;
    session.accessTokenExpiresAt = 0;
}

/**
 * Posts the refresh token to PingOne and stores the access token.
 * Persists a rotated refresh token. Throws when the exchange fails.
 */
async function exchange(): Promise<string> {
    const refreshToken = operatorRefreshToken();

    if (!refreshToken) {
        throw new Error(MISSING_REFRESH_TOKEN);
    }

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: OIDC_CLIENT_ID,
    });

    const response = await fetchToken(body);

    if (!response.ok) {
        throw new UpstreamError(replacePlaceholder(REFRESH_TOKEN_REJECTED, { status: response.status }));
    }

    let payload: unknown;

    try {
        payload = await response.json();
    } catch {
        throw new UpstreamError(UPSTREAM_NO_ACCESS_TOKEN);
    }

    const parsed = tokenSchema.safeParse(payload);

    if (!parsed.success) {
        throw new UpstreamError(UPSTREAM_NO_ACCESS_TOKEN);
    }

    const lifetimeMs = (parsed.data.expires_in ?? 3600) * 1000;
    const skewMs = Math.min(ACCESS_TOKEN_SKEW_MS, Math.floor(lifetimeMs / 2));

    session.accessToken = parsed.data.access_token;
    session.accessTokenExpiresAt = Date.now() + lifetimeMs - skewMs;

    const rotated = parsed.data.refresh_token;

    if (rotated && rotated !== refreshToken) {
        session.refreshToken = rotated;
        persistRefreshToken(rotated);
    }

    return parsed.data.access_token;
}

export { accessToken, clearSession, dropAccessToken, operatorEntryId, operatorRefreshToken };
