import type { LeaguePayload, LeagueRowView } from "../types";

/**
 * One page of standings, in upstream order.
 */
function mapLeague(payload: LeaguePayload): LeagueRowView[] {
    return payload.standings.results.map((row) => ({
        rank: row.rank,
        last_rank: row.last_rank,
        manager: row.player_name,
        team_name: row.entry_name,
        gameweek_points: row.event_total,
        total_points: row.total,
    }));
}

export { mapLeague };
