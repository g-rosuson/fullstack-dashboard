import { NotFoundError } from "../../../errors";
import { readLeague } from "../client";
import { LEAGUE_NOT_FOUND } from "../constants/messages";
import { replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapLeague } from "../mappers";

import type { LeagueInput, ToolResult } from "../types";

/**
 * Returns one page of classic-league standings.
 * Defaults to page 1. An unknown league is a tool error.
 */
async function league(input: LeagueInput): Promise<ToolResult> {
    const page = input.page ?? 1;

    try {
        const payload = await readLeague(input.league_id, page);

        return toolJson({ standings: mapLeague(payload) });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return toolError(replacePlaceholder(LEAGUE_NOT_FOUND, { leagueId: input.league_id }));
        }

        return toolFailure(error);
    }
}

export { league };
