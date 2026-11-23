import type { GameweekEvent, GameweekView } from "../types";

/**
 * Name, deadline, and finished flag for one gameweek.
 */
function mapGameweek(event: GameweekEvent): GameweekView {
    return {
        name: event.name,
        deadline: event.deadline_time,
        finished: event.finished,
    };
}

export { mapGameweek };
