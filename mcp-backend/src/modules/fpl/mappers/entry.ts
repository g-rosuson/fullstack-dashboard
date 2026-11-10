import type { EntryPayload, EntryView } from "../types";

/**
 * Team name, points, rank, and classic-league ids.
 */
function mapEntry(entry: EntryPayload): EntryView {
    return {
        team_name: entry.name,
        overall_points: entry.summary_overall_points,
        overall_rank: entry.summary_overall_rank,
        classic_league_ids: entry.leagues.classic.map((league) => league.id),
    };
}

export { mapEntry };
