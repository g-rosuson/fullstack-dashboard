import { readBootstrap } from "../client";
import { GAMEWEEK_NOT_IN_SEASON, MISSING_CURRENT_AND_NEXT } from "../constants/messages";
import { findEvent, replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapGameweek } from "../mappers";

import type { GameweekInput, ToolResult } from "../types";

/**
 * Returns the current and next gameweek, or the numbered gameweek when one is supplied.
 * Unknown gameweeks and upstream failures come back as tool errors.
 */
async function gameweek(input: GameweekInput): Promise<ToolResult> {
    try {
        const data = await readBootstrap();

        if (input.gameweek !== undefined) {
            const event = findEvent(data, input.gameweek);

            if (!event) {
                return toolError(replacePlaceholder(GAMEWEEK_NOT_IN_SEASON, { gameweek: input.gameweek }));
            }

            return toolJson(mapGameweek(event));
        }

        const current = findEvent(data, undefined);
        const next = data.events.find((event) => event.is_next);

        if (!current || !next) {
            return toolError(MISSING_CURRENT_AND_NEXT);
        }

        return toolJson({
            current: mapGameweek(current),
            next: mapGameweek(next),
        });
    } catch (error) {
        return toolFailure(error);
    }
}

export { gameweek };
