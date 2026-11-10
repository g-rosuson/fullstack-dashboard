import { NotFoundError, UpstreamError } from "../../../errors";
import { UPSTREAM_STATUS, UPSTREAM_UNUSABLE } from "../constants/messages";
import { replacePlaceholder } from "../helpers";
import { bootstrapSchema, entrySchema, fixtureListSchema, leagueSchema, liveSchema, picksSchema, playerSummarySchema, squadSchema } from "../schemas";
import { fetchAuthed, fetchPublic } from "./client";
import { clearSession } from "./session";

import type { ZodType } from "zod";
import type { Bootstrap, EntryPayload, FixturePayload, LeaguePayload, LivePayload, PicksPayload, PlayerSummary, SquadPayload } from "../types";

let bootstrapTask: Promise<Bootstrap> | undefined;

/**
 * Drops the bootstrap cache and the operator token session.
 */
function resetFplState(): void {
    bootstrapTask = undefined;
    clearSession();
}

/**
 * One bootstrap payload for the process. The first call fetches it; later calls reuse that copy.
 * A failed fetch is not cached.
 * Throws when Fantasy Premier League does not return bootstrap data.
 */
function readBootstrap(): Promise<Bootstrap> {
    if (!bootstrapTask) {
        bootstrapTask = loadBootstrap();
    }

    return bootstrapTask;
}

/**
 * Fetches bootstrap. Clears the cache when that fetch fails so the next call can retry.
 */
async function loadBootstrap(): Promise<Bootstrap> {
    try {
        return await readJson("/bootstrap-static/", bootstrapSchema);
    } catch (error) {
        bootstrapTask = undefined;
        throw error;
    }
}

/**
 * Fixtures for one gameweek.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readFixtures(gameweek: number): Promise<FixturePayload[]> {
    return readJson(`/fixtures/?event=${gameweek}`, fixtureListSchema);
}

/**
 * Season summary for one player.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readPlayerSummary(playerId: number): Promise<PlayerSummary> {
    return readJson(`/element-summary/${playerId}/`, playerSummarySchema);
}

/**
 * Public manager summary.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readEntry(entryId: number): Promise<EntryPayload> {
    return readJson(`/entry/${entryId}/`, entrySchema);
}

/**
 * Public lineup for a manager and gameweek.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readPicks(entryId: number, gameweek: number): Promise<PicksPayload> {
    return readJson(`/entry/${entryId}/event/${gameweek}/picks/`, picksSchema);
}

/**
 * Live element stats for a gameweek.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readLive(gameweek: number): Promise<LivePayload> {
    return readJson(`/event/${gameweek}/live/`, liveSchema);
}

/**
 * One page of classic-league standings. Page numbers start at 1.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readLeague(leagueId: number, page: number): Promise<LeaguePayload> {
    return readJson(`/leagues-classic/${leagueId}/standings/?page_standings=${page}`, leagueSchema);
}

/**
 * Operator squad. Sends the access token as `X-API-Authorization`.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the payload is unusable.
 */
function readSquad(entryId: number): Promise<SquadPayload> {
    return readJson(`/my-team/${entryId}/`, squadSchema, true);
}

/**
 * GET a Fantasy Premier League path and parse it with `schema`.
 * `authenticated` sends the operator access token. Defaults to a public read.
 * Throws {@link NotFoundError} on 404, or {@link UpstreamError} when the body is unusable.
 */
async function readJson<T>(path: string, schema: ZodType<T>, authenticated = false): Promise<T> {
    const response = authenticated ? await fetchAuthed(path) : await fetchPublic(path);

    if (response.status === 404) {
        throw new NotFoundError();
    }

    if (!response.ok) {
        throw new UpstreamError(replacePlaceholder(UPSTREAM_STATUS, { status: response.status }));
    }

    let body: unknown;

    try {
        body = await response.json();
    } catch {
        throw new UpstreamError(UPSTREAM_UNUSABLE);
    }

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
        throw new UpstreamError(UPSTREAM_UNUSABLE);
    }

    return parsed.data;
}

export { readBootstrap, readEntry, readFixtures, readLeague, readLive, readPicks, readPlayerSummary, readSquad, resetFplState };
