import { UpstreamError } from "../../../errors";
import { CREDENTIALS_REJECTED } from "../constants/messages";
import { API_ORIGIN, TOKEN_URL, USER_AGENT } from "./constants";
import { accessToken, dropAccessToken } from "./session";

const JSON_HEADERS = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
};

/**
 * POST the refresh-token grant to PingOne.
 */
function fetchToken(body: URLSearchParams): Promise<Response> {
    return fetch(TOKEN_URL, {
        method: "POST",
        headers: {
            ...JSON_HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
        cache: "no-store",
    });
}

/**
 * GET a public Fantasy Premier League path. No access token.
 */
function fetchPublic(path: string): Promise<Response> {
    return fetch(`${API_ORIGIN}${path}`, {
        headers: JSON_HEADERS,
        cache: "no-store",
    });
}

/**
 * GET `path` with `X-API-Authorization`. Does not retry.
 */
function fetchBearer(path: string, token: string): Promise<Response> {
    return fetch(`${API_ORIGIN}${path}`, {
        headers: {
            ...JSON_HEADERS,
            "X-API-Authorization": `Bearer ${token}`,
        },
        cache: "no-store",
    });
}

/**
 * GET `path` with `X-API-Authorization`. One refresh and retry on 401 or 403.
 * Throws when the retry is still rejected.
 */
async function fetchAuthed(path: string): Promise<Response> {
    const first = await fetchBearer(path, await accessToken());

    if (first.status !== 401 && first.status !== 403) {
        return first;
    }

    dropAccessToken();

    const second = await fetchBearer(path, await accessToken());

    if (second.status === 401 || second.status === 403) {
        throw new UpstreamError(CREDENTIALS_REJECTED);
    }

    return second;
}

export { fetchAuthed, fetchPublic, fetchToken };
