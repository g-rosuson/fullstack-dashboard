import type { LivePayload, LivePlayerView } from "../types";

/**
 * Live points for `playerIds`, in that order. A player missing from the payload scores zero.
 */
function mapLive(payload: LivePayload, playerIds: readonly number[]): LivePlayerView[] {
    const stats = new Map(payload.elements.map((element) => [element.id, element.stats]));

    return playerIds.map((id) => {
        const row = stats.get(id);

        return {
            id,
            points: row?.total_points ?? 0,
            minutes: row?.minutes ?? 0,
            bonus: row?.bonus ?? 0,
        };
    });
}

export { mapLive };
