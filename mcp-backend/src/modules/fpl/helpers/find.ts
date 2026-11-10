import type { Bootstrap, GameweekEvent } from "../types";

/**
 * The numbered gameweek, or the current one when `gameweek` is omitted.
 */
function findEvent(bootstrap: Bootstrap, gameweek: number | undefined): GameweekEvent | undefined {
    if (gameweek === undefined) {
        return bootstrap.events.find((event) => event.is_current);
    }

    return bootstrap.events.find((event) => event.id === gameweek);
}

export { findEvent };
