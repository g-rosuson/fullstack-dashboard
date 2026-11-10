/**
 * Module id in the catalog. Distinct from the tool names below.
 */
const NAME = "fpl";

/**
 * MCP tool names. Clients send these on `tools/call`.
 */
const TOOL_GAMEWEEK = "fpl_gameweek";
const TOOL_SEARCH_PLAYERS = "fpl_search_players";
const TOOL_PLAYER = "fpl_player";
const TOOL_FIXTURES = "fpl_fixtures";
const TOOL_ENTRY = "fpl_entry";
const TOOL_MY_TEAM = "fpl_my_team";
const TOOL_PICKS = "fpl_picks";
const TOOL_LIVE = "fpl_live";
const TOOL_LEAGUE = "fpl_league";

const TOOL_NAMES = [
    TOOL_GAMEWEEK,
    TOOL_SEARCH_PLAYERS,
    TOOL_PLAYER,
    TOOL_FIXTURES,
    TOOL_ENTRY,
    TOOL_MY_TEAM,
    TOOL_PICKS,
    TOOL_LIVE,
    TOOL_LEAGUE,
] as const;

const GAMEWEEK_DESCRIPTION = "Returns the current and next gameweek, or one numbered gameweek. Optional gameweek integer.";
const SEARCH_PLAYERS_DESCRIPTION =
    "Returns players matching a name, a club, or both. Optional name, club, and position strings, and optional max_price number.";
const PLAYER_DESCRIPTION = "Returns one player's season summary, gameweek history, and upcoming fixtures. Required player_id integer.";
const FIXTURES_DESCRIPTION = "Returns fixtures for a gameweek. Optional gameweek integer.";
const ENTRY_DESCRIPTION = "Returns a manager's rank, points, and classic-league ids. Optional entry_id integer.";
const MY_TEAM_DESCRIPTION = "Returns the operator's squad, bank, free transfers, and chips. No arguments.";
const PICKS_DESCRIPTION = "Returns a manager's lineup, captain, chip, and gameweek points. Optional entry_id and gameweek integers.";
const LIVE_DESCRIPTION =
    "Returns live points for named players or the operator's squad. Optional gameweek integer and optional player_ids array of integers.";
const LEAGUE_DESCRIPTION = "Returns a page of classic-league standings. Required league_id integer. Optional page integer.";

/**
 * FPL stores money in tenths of a million. 100 is 10.0.
 */
const TENTHS_PER_MILLION = 10;

/**
 * Pitch slots are 1 through 11. Higher slots are the bench.
 */
const PITCH_SLOT_COUNT = 11;

/**
 * Bootstrap `status` codes. Anything else is treated as unavailable.
 */
const AVAILABILITY: Record<string, string> = {
    a: "available",
    d: "doubtful",
    i: "injured",
    n: "unavailable",
    s: "suspended",
    u: "unavailable",
};

export {
    AVAILABILITY,
    ENTRY_DESCRIPTION,
    FIXTURES_DESCRIPTION,
    GAMEWEEK_DESCRIPTION,
    LEAGUE_DESCRIPTION,
    LIVE_DESCRIPTION,
    MY_TEAM_DESCRIPTION,
    NAME,
    PICKS_DESCRIPTION,
    PITCH_SLOT_COUNT,
    PLAYER_DESCRIPTION,
    SEARCH_PLAYERS_DESCRIPTION,
    TENTHS_PER_MILLION,
    TOOL_ENTRY,
    TOOL_FIXTURES,
    TOOL_GAMEWEEK,
    TOOL_LEAGUE,
    TOOL_LIVE,
    TOOL_MY_TEAM,
    TOOL_NAMES,
    TOOL_PICKS,
    TOOL_PLAYER,
    TOOL_SEARCH_PLAYERS,
};
