import { NotFoundError } from "../../../errors";
import { operatorEntryId, readBootstrap, readPicks } from "../client";
import { GAMEWEEK_NOT_IN_SEASON, MISSING_CURRENT_GAMEWEEK, MISSING_ENTRY_ID, PICKS_NOT_FOUND } from "../constants/messages";
import { findEvent, replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapPicks } from "../mappers";

import type { PicksInput, ToolResult } from "../types";

/**
 * Returns starters, bench, captain, vice-captain, active chip, and gameweek points.
 * Defaults to `FPL_ENTRY_ID` and the current gameweek.
 * A missing operator team is a tool error.
 */
async function picks(input: PicksInput): Promise<ToolResult> {
    const entryId = input.entry_id ?? operatorEntryId();

    if (entryId === undefined) {
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

        const payload = await readPicks(entryId, event.id);

        return toolJson(mapPicks(payload, data));
    } catch (error) {
        if (error instanceof NotFoundError) {
            return toolError(replacePlaceholder(PICKS_NOT_FOUND, { entryId }));
        }

        return toolFailure(error);
    }
}

export { picks };
