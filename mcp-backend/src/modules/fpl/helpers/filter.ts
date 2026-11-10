import { mapPlayerHit } from "../mappers";
import { byId } from "./byId";
import { millions } from "./money";

import type { Bootstrap, Element, ElementType, PlayerHit, Team } from "../types";

interface PlayerQuery {
    name?: string;
    club?: string;
    position?: string;
    maxPrice?: number;
}

/**
 * Bootstrap players that match a name, a club, or both, plus any position or price limit.
 * Matching is case-insensitive. `maxPrice` is in millions.
 */
function filterPlayers(bootstrap: Bootstrap, query: PlayerQuery): PlayerHit[] {
    const teams = byId(bootstrap.teams);
    const positions = byId(bootstrap.element_types);
    const hits: PlayerHit[] = [];

    for (const element of bootstrap.elements) {
        if (query.name && !matchesName(element, query.name)) {
            continue;
        }

        const team = teams.get(element.team);

        if (query.club && !matchesClub(team, query.club)) {
            continue;
        }

        const role = positions.get(element.element_type);

        if (query.position && !matchesPosition(role, query.position)) {
            continue;
        }

        if (query.maxPrice !== undefined && millions(element.now_cost) > query.maxPrice) {
            continue;
        }

        hits.push(mapPlayerHit(element, team, role));
    }

    return hits;
}

/**
 * Case-insensitive match on the web name or "first last".
 */
function matchesName(element: Element, name: string): boolean {
    const needle = name.toLowerCase();
    const full = `${element.first_name} ${element.second_name}`.toLowerCase();

    return element.web_name.toLowerCase().includes(needle) || full.includes(needle);
}

/**
 * Case-insensitive club name contains `club`, or the short name equals it.
 */
function matchesClub(team: Team | undefined, club: string): boolean {
    if (!team) {
        return false;
    }

    const needle = club.toLowerCase();

    return team.name.toLowerCase().includes(needle) || team.short_name.toLowerCase() === needle;
}

/**
 * Case-insensitive match on the full position name or its short code.
 */
function matchesPosition(role: ElementType | undefined, position: string): boolean {
    if (!role) {
        return false;
    }

    const needle = position.toLowerCase();

    return role.singular_name.toLowerCase() === needle || role.singular_name_short.toLowerCase() === needle;
}

export { filterPlayers };
