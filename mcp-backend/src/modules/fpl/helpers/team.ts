import type { Team } from "../types";

/**
 * Club name for `id`, or `Team ${id}` when bootstrap has no such club.
 */
function teamName(teams: Map<number, Team>, id: number): string {
    return teams.get(id)?.name ?? `Team ${id}`;
}

export { teamName };
