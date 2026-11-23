import { readBootstrap, readFixtures } from "../client";
import { GAMEWEEK_NOT_IN_SEASON, MISSING_CURRENT_GAMEWEEK } from "../constants/messages";
import { findEvent, replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapFixtures } from "../mappers";

import type { FixturesInput, ToolResult } from "../types";

/**
 * Returns fixtures for the supplied gameweek, or the current gameweek when none is supplied.
 * Scores are included once the match has them. Unknown gameweeks and upstream failures are tool errors.
 */
async function fixtures(input: FixturesInput): Promise<ToolResult> {
    try {
        const data = await readBootstrap();
        const event = findEvent(data, input.gameweek);

        if (!event) {
            return toolError(
                input.gameweek === undefined ? MISSING_CURRENT_GAMEWEEK : replacePlaceholder(GAMEWEEK_NOT_IN_SEASON, { gameweek: input.gameweek }),
            );
        }

        const payload = await readFixtures(event.id);

        return toolJson({ fixtures: mapFixtures(payload, data, event.id) });
    } catch (error) {
        return toolFailure(error);
    }
}

export { fixtures };
