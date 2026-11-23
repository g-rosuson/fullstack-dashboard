import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";

import { parseEnv } from "../../config/env/env";
import { resetFplState } from "./client";
import fpl from "./";
import { NAME, TOOL_NAMES } from "./constants";
import { entry } from "./tools/entry";
import { fixtures } from "./tools/fixtures";
import { gameweek } from "./tools/gameweek";
import { league } from "./tools/league";
import { live } from "./tools/live";
import { picks } from "./tools/picks";
import { player, searchPlayers } from "./tools/players";
import { squad } from "./tools/squad";

import type { ToolResult } from "./types";

const originalFetch = globalThis.fetch;

interface Call {
    url: string;
    init: RequestInit | undefined;
}

const calls: Call[] = [];

const bootstrap = {
    events: [
        {
            id: 1,
            name: "Gameweek 1",
            deadline_time: "2026-08-15T10:00:00Z",
            finished: true,
            is_current: false,
            is_next: false,
        },
        {
            id: 2,
            name: "Gameweek 2",
            deadline_time: "2026-08-22T10:00:00Z",
            finished: false,
            is_current: true,
            is_next: false,
        },
        {
            id: 3,
            name: "Gameweek 3",
            deadline_time: "2026-08-29T10:00:00Z",
            finished: false,
            is_current: false,
            is_next: true,
        },
    ],
    teams: [
        { id: 1, name: "Arsenal", short_name: "ARS" },
        { id: 2, name: "Chelsea", short_name: "CHE" },
        { id: 3, name: "Man City", short_name: "MCI" },
    ],
    element_types: [
        { id: 1, singular_name: "Goalkeeper", singular_name_short: "GKP" },
        { id: 2, singular_name: "Defender", singular_name_short: "DEF" },
        { id: 3, singular_name: "Midfielder", singular_name_short: "MID" },
        { id: 4, singular_name: "Forward", singular_name_short: "FWD" },
    ],
    elements: [
        {
            id: 10,
            web_name: "Saka",
            first_name: "Bukayo",
            second_name: "Saka",
            team: 1,
            element_type: 3,
            now_cost: 100,
            form: "6.5",
            total_points: 80,
            selected_by_percent: "40.0",
            status: "a",
        },
        {
            id: 11,
            web_name: "Raya",
            first_name: "David",
            second_name: "Raya",
            team: 1,
            element_type: 1,
            now_cost: 55,
            form: "3.0",
            total_points: 40,
            selected_by_percent: "20.0",
            status: "d",
        },
        {
            id: 12,
            web_name: "Haaland",
            first_name: "Erling",
            second_name: "Haaland",
            team: 3,
            element_type: 4,
            now_cost: 145,
            form: "8.0",
            total_points: 90,
            selected_by_percent: "60.0",
            status: "i",
        },
    ],
};

const playerSummary = {
    history: [{ opponent_team: 2, minutes: 90, total_points: 12 }],
    fixtures: [
        {
            kickoff_time: "2026-08-22T16:30:00Z",
            difficulty: 4,
            is_home: true,
            team_h: 1,
            team_a: 2,
        },
    ],
};

const currentFixtures = [
    {
        event: 2,
        team_h: 1,
        team_a: 2,
        team_h_score: 2,
        team_a_score: 1,
        kickoff_time: "2026-08-22T11:30:00Z",
        team_h_difficulty: 3,
        team_a_difficulty: 4,
        finished: true,
    },
    {
        event: 2,
        team_h: 3,
        team_a: 2,
        team_h_score: null,
        team_a_score: null,
        kickoff_time: "2026-08-23T13:00:00Z",
        team_h_difficulty: 2,
        team_a_difficulty: 5,
        finished: false,
    },
];

const entryPayload = {
    name: "Template Team",
    summary_overall_points: 42,
    summary_overall_rank: 1000,
    leagues: { classic: [{ id: 3 }, { id: 9 }] },
};

const squadPayload = {
    picks: [
        { element: 10, position: 1, purchase_price: 100 },
        { element: 11, position: 12, purchase_price: 55 },
    ],
    chips: [
        { name: "wildcard", status_for_entry: "available" },
        { name: "bboost", status_for_entry: "used" },
        { name: "freehit", status_for_entry: "unavailable" },
    ],
    transfers: { bank: 5, value: 1000, limit: 2, made: 1 },
};

const picksPayload = {
    active_chip: "bboost",
    entry_history: { points: 55 },
    picks: [
        { element: 10, position: 1, is_captain: true, is_vice_captain: false },
        { element: 11, position: 12, is_captain: false, is_vice_captain: true },
    ],
};

const livePayload = {
    elements: [
        { id: 10, stats: { minutes: 80, total_points: 9, bonus: 2 } },
        { id: 11, stats: { minutes: 90, total_points: 6, bonus: 0 } },
        { id: 12, stats: { minutes: 90, total_points: 13, bonus: 3 } },
    ],
};

const leaguePayload = {
    standings: {
        results: [
            {
                rank: 1,
                last_rank: 2,
                player_name: "Ada",
                entry_name: "Ada FC",
                event_total: 70,
                total: 400,
            },
        ],
    },
};

/**
 * JSON response for a mocked Fantasy Premier League call.
 */
function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * Replaces fetch and records each call. Unmatched tests install their own resolver.
 */
function installFetch(resolve: (url: string, init: RequestInit | undefined) => Response): void {
    calls.length = 0;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        return resolve(url, init);
    }) as typeof fetch;
}

/**
 * Routes a mocked call by URL substring. The first match wins. Anything else is HTTP 500.
 */
function installRoutes(routes: { match: string; body: unknown; status?: number }[]): void {
    installFetch((url) => {
        const route = routes.find((item) => url.includes(item.match));

        if (!route) {
            return jsonResponse({ missing: url }, 500);
        }

        return jsonResponse(route.body, route.status ?? 200);
    });
}

/**
 * Text of the first tool content block.
 */
function textOf(result: ToolResult): string {
    const block = result.content[0];

    if (!block) {
        throw new Error("missing tool text");
    }

    return block.text;
}

/**
 * Asserts a successful tool result and returns its JSON body.
 */
function expectOk(result: ToolResult): unknown {
    expect(result.isError).not.toBe(true);
    return JSON.parse(textOf(result));
}

/**
 * Asserts a tool error whose text contains `snippet` and has no JSON-RPC error member.
 */
function expectErr(result: ToolResult, snippet: string): void {
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(snippet);
    expect("error" in result).toBe(false);
}

/**
 * Bearer header sent on an authenticated call.
 */
function bearer(init: RequestInit | undefined): string | null {
    return new Headers(init?.headers).get("X-API-Authorization");
}

/**
 * Refresh token posted to the token endpoint.
 */
function sentRefreshToken(init: RequestInit | undefined): string | null {
    if (typeof init?.body !== "string") {
        return null;
    }

    return new URLSearchParams(init.body).get("refresh_token");
}

beforeEach(() => {
    resetFplState();
    delete process.env.FPL_REFRESH_TOKEN;
    delete process.env.FPL_ENTRY_ID;
    installFetch(() => jsonResponse({ error: "unmocked" }, 500));
});

afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.FPL_REFRESH_TOKEN;
    delete process.env.FPL_ENTRY_ID;
    resetFplState();
});

describe("catalog", () => {
    test("enrolls the fantasy tools", () => {
        expect(fpl.name).toBe("fpl");
        expect([...fpl.toolNames]).toEqual([
            "fpl_gameweek",
            "fpl_search_players",
            "fpl_player",
            "fpl_fixtures",
            "fpl_entry",
            "fpl_my_team",
            "fpl_picks",
            "fpl_live",
            "fpl_league",
        ]);
    });

    test("operator credentials stay out of platform config", () => {
        const config = parseEnv({
            HOST: "127.0.0.1",
            PORT: "3000",
            LOG_LEVEL: "info",
            SHUTDOWN_TIMEOUT_MS: "10000",
            FPL_REFRESH_TOKEN: "token",
            FPL_ENTRY_ID: "77",
        });

        expect("FPL_REFRESH_TOKEN" in config).toBe(false);
        expect("FPL_ENTRY_ID" in config).toBe(false);
    });

    test("each tool carries the fpl domain", () => {
        const server = new McpServer({ name: "test", version: "0.0.0" });

        fpl.register(server);

        const registered = server as unknown as {
            _registeredTools: Record<string, { _meta?: { domain?: string } }>;
        };

        for (const name of TOOL_NAMES) {
            expect(registered._registeredTools[name]?._meta).toEqual({ domain: NAME });
        }
    });
});

describe("gameweek", () => {
    test("FR-FPL-GWK-001 returns the current and next gameweek", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        const body = expectOk(await gameweek({}));

        expect(body).toEqual({
            current: { name: "Gameweek 2", deadline: "2026-08-22T10:00:00Z", finished: false },
            next: { name: "Gameweek 3", deadline: "2026-08-29T10:00:00Z", finished: false },
        });
    });

    test("FR-FPL-GWK-002 returns one numbered gameweek", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        const body = expectOk(await gameweek({ gameweek: 1 }));

        expect(body).toEqual({ name: "Gameweek 1", deadline: "2026-08-15T10:00:00Z", finished: true });
    });

    test("FR-FPL-GWK-003 refuses a gameweek outside the season", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        expectErr(await gameweek({ gameweek: 99 }), "99");
    });

    test("HTTP-FPL-ERR-001 upstream failure is a tool error", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: {}, status: 500 }]);

        const result = await gameweek({});

        expect(result.isError).toBe(true);
        expect(textOf(result).length).toBeGreaterThan(0);
        expect("error" in result).toBe(false);
    });
});

describe("players", () => {
    test("FR-FPL-PLR-001 returns players that match a name", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        const body = expectOk(await searchPlayers({ name: "saka" }));

        expect(body).toEqual({
            players: [
                {
                    id: 10,
                    name: "Saka",
                    club: "Arsenal",
                    position: "Midfielder",
                    price: 10,
                    form: "6.5",
                    total_points: 80,
                    selected_by_percent: "40.0",
                    availability: "available",
                },
            ],
        });
    });

    test("FR-FPL-PLR-002 refuses a search with neither name nor club", async () => {
        const result = await searchPlayers({});

        expectErr(result, "name");
        expect(textOf(result)).toContain("club");
        expect(calls).toHaveLength(0);
    });

    test("FR-FPL-PLR-003 position filter keeps only that position", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        const keepers = expectOk(await searchPlayers({ club: "Arsenal", position: "GKP" }));
        const forwards = expectOk(await searchPlayers({ name: "Saka", position: "Forward" }));

        expect(keepers).toEqual({
            players: [
                {
                    id: 11,
                    name: "Raya",
                    club: "Arsenal",
                    position: "Goalkeeper",
                    price: 5.5,
                    form: "3.0",
                    total_points: 40,
                    selected_by_percent: "20.0",
                    availability: "doubtful",
                },
            ],
        });
        expect(forwards).toEqual({ players: [] });
    });

    test("FR-FPL-PLR-003 maximum price keeps only players at or under it", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        const body = expectOk(await searchPlayers({ club: "ARS", max_price: 6 }));

        expect(body).toMatchObject({ players: [{ id: 11, price: 5.5 }] });
    });

    test("FR-FPL-PLR-004 returns one player's history and fixtures", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/element-summary/10/", body: playerSummary },
        ]);

        const body = expectOk(await player({ player_id: 10 }));

        expect(body).toEqual({
            id: 10,
            name: "Saka",
            club: "Arsenal",
            position: "Midfielder",
            price: 10,
            total_points: 80,
            form: "6.5",
            history: [{ opponent: "Chelsea", minutes: 90, points: 12 }],
            fixtures: [{ opponent: "Chelsea", kickoff: "2026-08-22T16:30:00Z", difficulty: 4 }],
        });
    });

    test("FR-FPL-PLR-005 refuses an unknown player", async () => {
        installRoutes([{ match: "/bootstrap-static/", body: bootstrap }]);

        expectErr(await player({ player_id: 999999 }), "999999");
    });
});

describe("fixtures", () => {
    test("FR-FPL-FIX-001 returns clubs, kickoff, difficulty, and the score when played", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/fixtures/", body: currentFixtures },
        ]);

        const body = expectOk(await fixtures({ gameweek: 2 }));

        expect(body).toEqual({
            fixtures: [
                {
                    home: "Arsenal",
                    away: "Chelsea",
                    kickoff: "2026-08-22T11:30:00Z",
                    home_difficulty: 3,
                    away_difficulty: 4,
                    home_score: 2,
                    away_score: 1,
                },
                {
                    home: "Man City",
                    away: "Chelsea",
                    kickoff: "2026-08-23T13:00:00Z",
                    home_difficulty: 2,
                    away_difficulty: 5,
                },
            ],
        });
    });

    test("FR-FPL-FIX-002 defaults to the current gameweek", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/fixtures/", body: currentFixtures },
        ]);

        expectOk(await fixtures({}));

        expect(calls.some((call) => call.url.includes("/fixtures/?event=2"))).toBe(true);
    });
});

describe("entry", () => {
    test("FR-FPL-ENT-001 returns rank, points, and classic leagues", async () => {
        installRoutes([{ match: "/entry/1/", body: entryPayload }]);

        const body = expectOk(await entry({ entry_id: 1 }));

        expect(body).toEqual({
            team_name: "Template Team",
            overall_points: 42,
            overall_rank: 1000,
            classic_league_ids: [3, 9],
        });
    });

    test("FR-FPL-ENT-002 defaults to the operator team", async () => {
        process.env.FPL_ENTRY_ID = "77";
        installRoutes([{ match: "/entry/77/", body: entryPayload }]);

        expectOk(await entry({}));

        expect(calls.some((call) => call.url.includes("/entry/77/"))).toBe(true);
    });

    test("FR-FPL-ENT-003 refuses a manager request with no operator team", async () => {
        expectErr(await entry({}), "FPL_ENTRY_ID");
        expect(calls).toHaveLength(0);
    });

    test("FR-FPL-ENT-004 refuses an unknown manager", async () => {
        installRoutes([{ match: "/entry/999999/", body: {}, status: 404 }]);

        expectErr(await entry({ entry_id: 999999 }), "999999");
    });
});

describe("squad", () => {
    test("FR-FPL-SQD-001 FR-FPL-SQD-002 FR-FPL-SQD-003 returns bank, players, and chips", async () => {
        process.env.FPL_REFRESH_TOKEN = "original";
        process.env.FPL_ENTRY_ID = "77";
        installFetch((url) => {
            if (url.includes("/as/token")) {
                return jsonResponse({ access_token: "access-1", expires_in: 3600 });
            }

            if (url.includes("/bootstrap-static/")) {
                return jsonResponse(bootstrap);
            }

            if (url.includes("/my-team/77/")) {
                return jsonResponse(squadPayload);
            }

            return jsonResponse({ missing: url }, 500);
        });

        const body = expectOk(await squad());

        expect(body).toEqual({
            bank: 0.5,
            squad_value: 100,
            free_transfers: 1,
            players: [
                { name: "Saka", club: "Arsenal", position: "Midfielder", slot: 1, price: 10 },
                { name: "Raya", club: "Arsenal", position: "Goalkeeper", slot: 12, price: 5.5 },
            ],
            chips: { available: ["wildcard"], used: ["bboost"] },
        });
        expect(calls.some((call) => bearer(call.init) === "Bearer access-1")).toBe(true);
    });

    test("FR-FPL-SQD-004 refuses the squad when credentials are missing", async () => {
        expectErr(await squad(), "FPL_REFRESH_TOKEN");

        process.env.FPL_REFRESH_TOKEN = "original";

        expectErr(await squad(), "FPL_ENTRY_ID");
        expect(calls.some((call) => call.url.includes("account.premierleague.com"))).toBe(false);
    });

    test("FR-FPL-SQD-005 a rotated refresh token still reads the squad", async () => {
        const previousDirectory = process.cwd();
        const directory = mkdtempSync(join(import.meta.dir, ".tmp-"));
        const envPath = join(directory, ".env");
        writeFileSync(envPath, "FPL_REFRESH_TOKEN=original\n");
        process.env.FPL_REFRESH_TOKEN = "original";
        process.env.FPL_ENTRY_ID = "77";

        const sent: string[] = [];

        installFetch((url, init) => {
            if (url.includes("/as/token")) {
                const token = sentRefreshToken(init) ?? "";
                sent.push(token);

                if (token === "original") {
                    return jsonResponse({ access_token: "access-1", refresh_token: "rotated", expires_in: 0 });
                }

                if (token === "rotated") {
                    return jsonResponse({ access_token: "access-2", refresh_token: "rotated", expires_in: 3600 });
                }

                return jsonResponse({ error: "invalid_grant" }, 400);
            }

            if (url.includes("/bootstrap-static/")) {
                return jsonResponse(bootstrap);
            }

            if (url.includes("/my-team/77/")) {
                const authorization = bearer(init);

                if (authorization === "Bearer access-1" || authorization === "Bearer access-2") {
                    return jsonResponse(squadPayload);
                }

                return jsonResponse({}, 401);
            }

            return jsonResponse({ missing: url }, 500);
        });

        process.chdir(directory);

        try {
            expectOk(await squad());
            expectOk(await squad());
            expect(sent).toEqual(["original", "rotated"]);
            expect(readFileSync(envPath, "utf8")).toContain("FPL_REFRESH_TOKEN=rotated");
            expect(readFileSync(envPath, "utf8")).not.toContain("original");
        } finally {
            process.chdir(previousDirectory);
            rmSync(directory, { recursive: true, force: true });
        }
    });

    test("retries a squad read once after a 401", async () => {
        process.env.FPL_REFRESH_TOKEN = "original";
        process.env.FPL_ENTRY_ID = "77";

        let tokenCalls = 0;

        installFetch((url, init) => {
            if (url.includes("/as/token")) {
                tokenCalls += 1;
                return jsonResponse({ access_token: tokenCalls === 1 ? "access-1" : "access-2", expires_in: 3600 });
            }

            if (url.includes("/bootstrap-static/")) {
                return jsonResponse(bootstrap);
            }

            if (url.includes("/my-team/77/")) {
                if (bearer(init) === "Bearer access-1") {
                    return jsonResponse({}, 401);
                }

                return jsonResponse(squadPayload);
            }

            return jsonResponse({ missing: url }, 500);
        });

        expectOk(await squad());

        const squadCalls = calls.filter((call) => call.url.includes("/my-team/77/"));
        expect(squadCalls).toHaveLength(2);
        expect(bearer(squadCalls[1]?.init)).toBe("Bearer access-2");
    });
});

describe("picks", () => {
    test("FR-FPL-PCK-001 returns the lineup, captain, chip, and points", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/picks/", body: picksPayload },
        ]);

        const body = expectOk(await picks({ entry_id: 1, gameweek: 1 }));

        expect(body).toEqual({
            starters: ["Saka"],
            bench: ["Raya"],
            captain: "Saka",
            vice_captain: "Raya",
            active_chip: "bboost",
            gameweek_points: 55,
        });
    });

    test("FR-FPL-PCK-002 defaults to the operator team", async () => {
        process.env.FPL_ENTRY_ID = "77";
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/picks/", body: picksPayload },
        ]);

        expectOk(await picks({ gameweek: 2 }));

        expect(calls.some((call) => call.url.includes("/entry/77/event/2/picks/"))).toBe(true);
    });

    test("FR-FPL-PCK-003 defaults to the current gameweek", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/picks/", body: picksPayload },
        ]);

        expectOk(await picks({ entry_id: 77 }));

        expect(calls.some((call) => call.url.includes("/entry/77/event/2/picks/"))).toBe(true);
    });

    test("FR-FPL-PCK-004 refuses picks with no operator team", async () => {
        expectErr(await picks({}), "FPL_ENTRY_ID");
        expect(calls).toHaveLength(0);
    });
});

describe("live", () => {
    test("FR-FPL-LIV-001 returns points, minutes, and bonus for named players", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/live/", body: livePayload },
        ]);

        const body = expectOk(await live({ gameweek: 1, player_ids: [10] }));

        expect(body).toEqual({
            players: [{ id: 10, points: 9, minutes: 80, bonus: 2 }],
        });
    });

    test("FR-FPL-LIV-002 defaults to the operator squad", async () => {
        process.env.FPL_ENTRY_ID = "77";
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/picks/", body: picksPayload },
            { match: "/live/", body: livePayload },
        ]);

        const body = expectOk(await live({ gameweek: 2 }));

        expect(body).toEqual({
            players: [
                { id: 10, points: 9, minutes: 80, bonus: 2 },
                { id: 11, points: 6, minutes: 90, bonus: 0 },
            ],
        });
    });

    test("FR-FPL-LIV-003 defaults to the current gameweek", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/live/", body: livePayload },
        ]);

        expectOk(await live({ player_ids: [12] }));

        expect(calls.some((call) => call.url.includes("/event/2/live/"))).toBe(true);
    });

    test("FR-FPL-LIV-004 refuses a live request with no operator team", async () => {
        expectErr(await live({}), "FPL_ENTRY_ID");
        expect(calls).toHaveLength(0);
    });
});

describe("league", () => {
    test("FR-FPL-LGE-001 FR-FPL-LGE-002 returns the first page of standings", async () => {
        installRoutes([{ match: "/standings/", body: leaguePayload }]);

        const body = expectOk(await league({ league_id: 1 }));

        expect(body).toEqual({
            standings: [
                {
                    rank: 1,
                    last_rank: 2,
                    manager: "Ada",
                    team_name: "Ada FC",
                    gameweek_points: 70,
                    total_points: 400,
                },
            ],
        });
        expect(calls.some((call) => call.url.includes("/leagues-classic/1/standings/?page_standings=1"))).toBe(true);
    });

    test("FR-FPL-LGE-003 refuses an unknown league", async () => {
        installRoutes([{ match: "/leagues-classic/999999/", body: {}, status: 404 }]);

        expectErr(await league({ league_id: 999999 }), "999999");
    });
});

describe("access", () => {
    test("FR-FPL-ACC-001 public reads work without a refresh token", async () => {
        installRoutes([
            { match: "/bootstrap-static/", body: bootstrap },
            { match: "/element-summary/10/", body: playerSummary },
            { match: "/fixtures/", body: currentFixtures },
            { match: "/picks/", body: picksPayload },
            { match: "/live/", body: livePayload },
            { match: "/standings/", body: leaguePayload },
            { match: "/entry/", body: entryPayload },
        ]);

        expectOk(await gameweek({}));
        expectOk(await searchPlayers({ name: "Saka" }));
        expectOk(await player({ player_id: 10 }));
        expectOk(await fixtures({}));
        expectOk(await entry({ entry_id: 77 }));
        expectOk(await picks({ entry_id: 77, gameweek: 2 }));
        expectOk(await live({ gameweek: 2, player_ids: [10] }));
        expectOk(await league({ league_id: 3 }));

        expect(calls.some((call) => call.url.includes("account.premierleague.com"))).toBe(false);
        expect(calls.filter((call) => call.url.includes("/bootstrap-static/"))).toHaveLength(1);
    });
});
