/**
 * Tool refusals and upstream failures. `{name}` is replaced by `replacePlaceholder`.
 */

const MISSING_ENTRY_ID = "FPL_ENTRY_ID is not configured";
const MISSING_REFRESH_TOKEN = "FPL_REFRESH_TOKEN is not configured";
const NAME_OR_CLUB = "Provide a name or a club";
const UPSTREAM_UNUSABLE = "Fantasy Premier League did not return the requested data";
const UPSTREAM_NO_ACCESS_TOKEN = "Fantasy Premier League did not return an access token";
const CREDENTIALS_REJECTED = "Fantasy Premier League rejected the operator credentials";
const MISSING_CURRENT_AND_NEXT = "Fantasy Premier League did not return the current and next gameweek";
const MISSING_CURRENT_GAMEWEEK = "Fantasy Premier League did not return the current gameweek";
const MANAGER_NOT_FOUND = "Manager {entryId} was not found";
const PLAYER_NOT_FOUND = "Player {playerId} was not found";
const LEAGUE_NOT_FOUND = "League {leagueId} was not found";
const PICKS_NOT_FOUND = "Picks for manager {entryId} were not found";
const GAMEWEEK_NOT_IN_SEASON = "Gameweek {gameweek} is not in the current season";
const UPSTREAM_STATUS = "Fantasy Premier League did not return the requested data ({status})";
const REFRESH_TOKEN_REJECTED = "Fantasy Premier League did not accept the refresh token ({status})";

export {
    CREDENTIALS_REJECTED,
    GAMEWEEK_NOT_IN_SEASON,
    LEAGUE_NOT_FOUND,
    MANAGER_NOT_FOUND,
    MISSING_CURRENT_AND_NEXT,
    MISSING_CURRENT_GAMEWEEK,
    MISSING_ENTRY_ID,
    MISSING_REFRESH_TOKEN,
    NAME_OR_CLUB,
    PICKS_NOT_FOUND,
    PLAYER_NOT_FOUND,
    REFRESH_TOKEN_REJECTED,
    UPSTREAM_NO_ACCESS_TOKEN,
    UPSTREAM_STATUS,
    UPSTREAM_UNUSABLE,
};
