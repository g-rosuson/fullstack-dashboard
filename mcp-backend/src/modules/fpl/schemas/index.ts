/**
 * MCP tool inputs and the Fantasy Premier League JSON this module reads.
 * Inputs are what `tools/call` sends. The other schemas are upstream bodies, not the tool JSON.
 * Upstream money fields (`now_cost`, `purchase_price`, `bank`, `value`) are tenths of a million.
 */

import { z } from "zod";

/** Positive integer shared by ids, gameweeks, and pages. */
const positiveInt = z.number().int().positive();

/** `fpl_gameweek`. Omit `gameweek` for the current and next events. */
const gameweekInputSchema = z.object({
    gameweek: positiveInt.optional(),
});

/** `fpl_search_players`. The tool rejects a call that has neither `name` nor `club`. `max_price` is in millions. */
const searchPlayersInputSchema = z.object({
    name: z.string().optional(),
    club: z.string().optional(),
    position: z.string().optional(),
    max_price: z.number().positive().optional(),
});

/** `fpl_player`. `player_id` is the bootstrap element id. */
const playerInputSchema = z.object({
    player_id: positiveInt,
});

/** `fpl_fixtures`. Omit `gameweek` for the current event. */
const fixturesInputSchema = z.object({
    gameweek: positiveInt.optional(),
});

/** `fpl_entry`. Omit `entry_id` to use `FPL_ENTRY_ID`. */
const entryInputSchema = z.object({
    entry_id: positiveInt.optional(),
});

/** `fpl_my_team`. No arguments; the operator comes from the environment. */
const squadInputSchema = z.object({});

/** `fpl_picks`. Omitted fields fall back to the operator team and the current gameweek. */
const picksInputSchema = z.object({
    entry_id: positiveInt.optional(),
    gameweek: positiveInt.optional(),
});

/** `fpl_live`. Omit `player_ids` to use the operator's picks for that gameweek. */
const liveInputSchema = z.object({
    gameweek: positiveInt.optional(),
    player_ids: z.array(positiveInt).optional(),
});

/** `fpl_league`. Omit `page` for the first page of standings. */
const leagueInputSchema = z.object({
    league_id: positiveInt,
    page: positiveInt.optional(),
});

/** One bootstrap gameweek. `deadline_time` is an ISO timestamp. */
const eventSchema = z.object({
    id: z.number(),
    name: z.string(),
    deadline_time: z.string(),
    finished: z.boolean(),
    is_current: z.boolean(),
    is_next: z.boolean(),
});

/** One club. `short_name` is the three-letter code used for exact club search. */
const teamSchema = z.object({
    id: z.number(),
    name: z.string(),
    short_name: z.string(),
});

/** One position. Search matches `singular_name` or `singular_name_short`. */
const elementTypeSchema = z.object({
    id: z.number(),
    singular_name: z.string(),
    singular_name_short: z.string(),
});

/** One player. `team` and `element_type` are ids. `status` is a single availability letter. */
const elementSchema = z.object({
    id: z.number(),
    web_name: z.string(),
    first_name: z.string(),
    second_name: z.string(),
    team: z.number(),
    element_type: z.number(),
    now_cost: z.number(),
    form: z.string(),
    total_points: z.number(),
    selected_by_percent: z.string(),
    status: z.string(),
});

/** `GET /bootstrap-static/`. Cached for the process. */
const bootstrapSchema = z.object({
    events: z.array(eventSchema),
    teams: z.array(teamSchema),
    element_types: z.array(elementTypeSchema),
    elements: z.array(elementSchema),
});

/** `GET /element-summary/{id}/`. History is played gameweeks; fixtures are still to come. */
const playerSummarySchema = z.object({
    history: z.array(
        z.object({
            opponent_team: z.number(),
            minutes: z.number(),
            total_points: z.number(),
        }),
    ),
    fixtures: z.array(
        z.object({
            kickoff_time: z.string().nullable(),
            difficulty: z.number(),
            is_home: z.boolean(),
            team_h: z.number(),
            team_a: z.number(),
        }),
    ),
});

/** `GET /fixtures/?event={gameweek}`. `event` is null when a fixture has no gameweek. */
const fixtureListSchema = z.array(
    z.object({
        event: z.number().nullable(),
        team_h: z.number(),
        team_a: z.number(),
        team_h_score: z.number().nullable(),
        team_a_score: z.number().nullable(),
        kickoff_time: z.string().nullable(),
        team_h_difficulty: z.number(),
        team_a_difficulty: z.number(),
        finished: z.boolean(),
    }),
);

/** `GET /entry/{id}/`. Only classic league ids are kept. */
const entrySchema = z.object({
    name: z.string(),
    summary_overall_points: z.number(),
    summary_overall_rank: z.number().nullable(),
    leagues: z.object({
        classic: z.array(
            z.object({
                id: z.number(),
            }),
        ),
    }),
});

/** `GET /my-team/{id}/`. Requires the operator access token. `position` is the lineup slot. */
const squadSchema = z.object({
    picks: z.array(
        z.object({
            element: z.number(),
            position: z.number(),
            purchase_price: z.number(),
        }),
    ),
    chips: z.array(
        z.object({
            name: z.string(),
            status_for_entry: z.string(),
        }),
    ),
    transfers: z.object({
        bank: z.number(),
        value: z.number(),
        limit: z.number().nullable(),
        made: z.number(),
    }),
});

/** `GET /entry/{id}/event/{gameweek}/picks/`. Public. `active_chip` is null when no chip is played. */
const picksSchema = z.object({
    active_chip: z.string().nullable(),
    entry_history: z.object({
        points: z.number(),
    }),
    picks: z.array(
        z.object({
            element: z.number(),
            position: z.number(),
            is_captain: z.boolean(),
            is_vice_captain: z.boolean(),
        }),
    ),
});

/** `GET /event/{gameweek}/live/`. One row per element that has stats. */
const liveSchema = z.object({
    elements: z.array(
        z.object({
            id: z.number(),
            stats: z.object({
                minutes: z.number(),
                total_points: z.number(),
                bonus: z.number(),
            }),
        }),
    ),
});

/** `GET /leagues-classic/{id}/standings/`. `results` is one page. */
const leagueSchema = z.object({
    standings: z.object({
        results: z.array(
            z.object({
                rank: z.number(),
                last_rank: z.number().nullable(),
                player_name: z.string(),
                entry_name: z.string(),
                event_total: z.number(),
                total: z.number(),
            }),
        ),
    }),
});

export {
    bootstrapSchema,
    entryInputSchema,
    entrySchema,
    fixtureListSchema,
    fixturesInputSchema,
    gameweekInputSchema,
    leagueInputSchema,
    leagueSchema,
    liveInputSchema,
    liveSchema,
    picksInputSchema,
    picksSchema,
    playerInputSchema,
    playerSummarySchema,
    searchPlayersInputSchema,
    squadInputSchema,
    squadSchema,
};
