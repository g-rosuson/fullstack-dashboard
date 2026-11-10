import { NotFoundError } from "../../../errors";
import { readBootstrap, readPlayerSummary } from "../client";
import { NAME_OR_CLUB, PLAYER_NOT_FOUND } from "../constants/messages";
import { filterPlayers, replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapPlayer } from "../mappers";

import type { PlayerInput, SearchPlayersInput, ToolResult } from "../types";

/**
 * Returns players that match a name, a club, or both.
 * Position and maximum price narrow that set. A search with neither name nor club is a tool error.
 */
async function searchPlayers(input: SearchPlayersInput): Promise<ToolResult> {
    const name = input.name?.trim() || undefined;
    const club = input.club?.trim() || undefined;

    if (!name && !club) {
        return toolError(NAME_OR_CLUB);
    }

    try {
        const data = await readBootstrap();
        const players = filterPlayers(data, {
            name,
            club,
            position: input.position?.trim() || undefined,
            maxPrice: input.max_price,
        });

        return toolJson({ players });
    } catch (error) {
        return toolFailure(error);
    }
}

/**
 * Returns one player's summary, per-gameweek history, and upcoming fixtures.
 * An unknown id is a tool error.
 */
async function player(input: PlayerInput): Promise<ToolResult> {
    try {
        const data = await readBootstrap();
        const element = data.elements.find((item) => item.id === input.player_id);

        if (!element) {
            return toolError(replacePlaceholder(PLAYER_NOT_FOUND, { playerId: input.player_id }));
        }

        const summary = await readPlayerSummary(input.player_id);

        return toolJson(mapPlayer(element, data, summary));
    } catch (error) {
        if (error instanceof NotFoundError) {
            return toolError(replacePlaceholder(PLAYER_NOT_FOUND, { playerId: input.player_id }));
        }

        return toolFailure(error);
    }
}

export { player, searchPlayers };
