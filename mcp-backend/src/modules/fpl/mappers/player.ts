import { AVAILABILITY } from "../constants";
import { byId } from "../helpers/byId";
import { millions } from "../helpers/money";
import { teamName } from "../helpers/team";

import type { Bootstrap, Element, ElementType, PlayerDetail, PlayerHit, PlayerSummary, Team } from "../types";

/**
 * One player's season summary, history, and upcoming fixtures.
 */
function mapPlayer(element: Element, bootstrap: Bootstrap, summary: PlayerSummary): PlayerDetail {
    const teams = byId(bootstrap.teams);
    const role = byId(bootstrap.element_types).get(element.element_type);
    const hit = mapPlayerHit(element, teams.get(element.team), role);

    return {
        id: hit.id,
        name: hit.name,
        club: hit.club,
        position: hit.position,
        price: hit.price,
        total_points: hit.total_points,
        form: hit.form,
        history: summary.history.map((row) => ({
            opponent: teamName(teams, row.opponent_team),
            minutes: row.minutes,
            points: row.total_points,
        })),
        fixtures: summary.fixtures.map((row) => ({
            opponent: teamName(teams, row.is_home ? row.team_a : row.team_h),
            kickoff: row.kickoff_time,
            difficulty: row.difficulty,
        })),
    };
}

/**
 * Search hit for one bootstrap player. Price is in millions.
 */
function mapPlayerHit(element: Element, team: Team | undefined, role: ElementType | undefined): PlayerHit {
    return {
        id: element.id,
        name: element.web_name,
        club: team?.name ?? `Team ${element.team}`,
        position: role?.singular_name ?? "Unknown",
        price: millions(element.now_cost),
        form: element.form,
        total_points: element.total_points,
        selected_by_percent: element.selected_by_percent,
        availability: AVAILABILITY[element.status] ?? "unavailable",
    };
}

export { mapPlayer, mapPlayerHit };
