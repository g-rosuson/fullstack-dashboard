/**
 * Tool arguments, parsed Fantasy Premier League payloads, and the JSON views tools return.
 * Payload money is still in tenths of a million. View money is in millions.
 */

import type { z } from "zod";

import type {
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
} from "../schemas";

/** `fpl_gameweek` arguments. `gameweek` omitted means the current and next events. */
type GameweekInput = z.infer<typeof gameweekInputSchema>;

/** `fpl_search_players` arguments. At least one of `name` or `club` is required by the tool. */
type SearchPlayersInput = z.infer<typeof searchPlayersInputSchema>;

/** `fpl_player` arguments. `player_id` is the bootstrap element id. */
type PlayerInput = z.infer<typeof playerInputSchema>;

/** `fpl_fixtures` arguments. `gameweek` omitted means the current event. */
type FixturesInput = z.infer<typeof fixturesInputSchema>;

/** `fpl_entry` arguments. `entry_id` omitted means `FPL_ENTRY_ID`. */
type EntryInput = z.infer<typeof entryInputSchema>;

/** `fpl_my_team` takes no arguments. */
type SquadInput = z.infer<typeof squadInputSchema>;

/** `fpl_picks` arguments. Omitted ids fall back to the operator team and the current gameweek. */
type PicksInput = z.infer<typeof picksInputSchema>;

/** `fpl_live` arguments. Omitted `player_ids` means the operator's picks for that gameweek. */
type LiveInput = z.infer<typeof liveInputSchema>;

/** `fpl_league` arguments. `page` omitted means page 1. */
type LeagueInput = z.infer<typeof leagueInputSchema>;

/** `bootstrap-static`: events, clubs, positions, and players for the season. */
type Bootstrap = z.infer<typeof bootstrapSchema>;

/** One gameweek from bootstrap. `is_current` and `is_next` pick the default events. */
type GameweekEvent = Bootstrap["events"][number];

/** One club from bootstrap. `short_name` is the three-letter code. */
type Team = Bootstrap["teams"][number];

/** One position from bootstrap, such as Goalkeeper or MID. */
type ElementType = Bootstrap["element_types"][number];

/** One player from bootstrap. `now_cost` is in tenths of a million. `status` is a single letter. */
type Element = Bootstrap["elements"][number];

/** `element-summary`: past gameweeks and upcoming fixtures for one player. */
type PlayerSummary = z.infer<typeof playerSummarySchema>;

/** One fixture. Scores are null until the match has them. `event` is null for a blank gameweek. */
type FixturePayload = z.infer<typeof fixtureListSchema>[number];

/** Public manager summary from `entry/{id}`. */
type EntryPayload = z.infer<typeof entrySchema>;

/** Authenticated squad from `my-team/{id}`. Prices and bank are in tenths of a million. */
type SquadPayload = z.infer<typeof squadSchema>;

/** Public picks for one manager and gameweek. `position` 1–11 is the pitch; higher is the bench. */
type PicksPayload = z.infer<typeof picksSchema>;

/** Live element stats for one gameweek. */
type LivePayload = z.infer<typeof liveSchema>;

/** One page of classic-league standings. */
type LeaguePayload = z.infer<typeof leagueSchema>;

/**
 * Tool payload. A type alias, because `CallToolResult` has a string index signature and an interface is not assignable to it.
 */
type ToolText = {
    type: "text";
    text: string;
};

type ToolResult = {
    content: ToolText[];
    isError?: true;
};

/** Gameweek returned to the client. `deadline` is the bootstrap timestamp. */
interface GameweekView {
    name: string;
    deadline: string;
    finished: boolean;
}

/** One search hit. `price` is in millions. `availability` is a word, not the bootstrap letter. */
interface PlayerHit {
    id: number;
    name: string;
    club: string;
    position: string;
    price: number;
    form: string;
    total_points: number;
    selected_by_percent: string;
    availability: string;
}

/** Player tool payload: the search hit plus history and upcoming fixtures. */
interface PlayerDetail {
    id: number;
    name: string;
    club: string;
    position: string;
    price: number;
    total_points: number;
    form: string;
    history: { opponent: string; minutes: number; points: number }[];
    fixtures: { opponent: string; kickoff: string | null; difficulty: number }[];
}

/** One fixture. Scores are omitted until both sides have one. */
interface FixtureView {
    home: string;
    away: string;
    kickoff: string | null;
    home_difficulty: number;
    away_difficulty: number;
    home_score?: number;
    away_score?: number;
}

/** Manager summary. `classic_league_ids` is every classic league on the entry. */
interface EntryView {
    team_name: string;
    overall_points: number;
    overall_rank: number | null;
    classic_league_ids: number[];
}

/** One squad player. `slot` is the lineup position. `price` is the purchase price in millions. */
interface SquadPlayerView {
    name: string;
    club: string;
    position: string;
    slot: number;
    price: number;
}

/** Operator squad. `bank` and `squad_value` are in millions. */
interface SquadView {
    bank: number;
    squad_value: number;
    free_transfers: number;
    players: SquadPlayerView[];
    chips: {
        available: string[];
        used: string[];
    };
}

/** Lineup for one gameweek. Names are web names. `active_chip` is null when no chip is played. */
interface PicksView {
    starters: string[];
    bench: string[];
    captain: string;
    vice_captain: string;
    active_chip: string | null;
    gameweek_points: number;
}

/** Live points for one element. A player missing from the payload scores zero. */
interface LivePlayerView {
    id: number;
    points: number;
    minutes: number;
    bonus: number;
}

/** One classic-league row. `last_rank` is null when the manager has no previous rank. */
interface LeagueRowView {
    rank: number;
    last_rank: number | null;
    manager: string;
    team_name: string;
    gameweek_points: number;
    total_points: number;
}

export type {
    Bootstrap,
    Element,
    ElementType,
    EntryInput,
    EntryPayload,
    EntryView,
    FixturePayload,
    FixtureView,
    FixturesInput,
    GameweekEvent,
    GameweekInput,
    GameweekView,
    LeagueInput,
    LeaguePayload,
    LeagueRowView,
    LiveInput,
    LivePayload,
    LivePlayerView,
    PicksInput,
    PicksPayload,
    PicksView,
    PlayerDetail,
    PlayerHit,
    PlayerInput,
    PlayerSummary,
    SearchPlayersInput,
    SquadInput,
    SquadPayload,
    SquadView,
    Team,
    ToolResult,
    ToolText,
};
