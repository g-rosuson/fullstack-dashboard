import { operatorEntryId, readBootstrap, readLive, readPicks } from "../client";
import { GAMEWEEK_NOT_IN_SEASON, MISSING_CURRENT_GAMEWEEK, MISSING_ENTRY_ID } from "../constants/messages";
import { findEvent, orderedPickIds, replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapLive } from "../mappers";

import type { LiveInput, ToolResult } from "../types";

/**
 * Returns live points, minutes, and bonus.
 * Defaults to the current gameweek. When no players are supplied, uses the operator squad for that gameweek.
 * A missing operator team on that path is a tool error.
 */
async function live(input: LiveInput): Promise<ToolResult> {
    if (input.player_ids === undefined && operatorEntryId() === undefined) {
        return toolError(MISSING_ENTRY_ID);
    }

    try {
        const data = await readBootstrap();
        const event = findEvent(data, input.gameweek);

        if (!event) {
            return toolError(
                input.gameweek === undefined ? MISSING_CURRENT_GAMEWEEK : replacePlaceholder(GAMEWEEK_NOT_IN_SEASON, { gameweek: input.gameweek }),
            );
        }

        const playerIds = await livePlayerIds(input.player_ids, event.id);

        const payload = await readLive(event.id);

        return toolJson({ players: mapLive(payload, playerIds) });
    } catch (error) {
        return toolFailure(error);
    }
}

/**
 * Supplied ids, or the operator's picks for `gameweek` when none were supplied.
 * Throws when the operator team is missing on that path.
 */
async function livePlayerIds(playerIds: readonly number[] | undefined, gameweek: number): Promise<number[]> {
    if (playerIds !== undefined) {
        return [...playerIds];
    }

    const entryId = operatorEntryId();

    if (entryId === undefined) {
        throw new Error(MISSING_ENTRY_ID);
    }

    const payload = await readPicks(entryId, gameweek);

    return orderedPickIds(payload);
}

export { live };
