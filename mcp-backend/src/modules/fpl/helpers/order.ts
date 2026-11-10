import type { PicksPayload } from "../types";

/**
 * Element ids in lineup order. Used when a live request names no players.
 */
function orderedPickIds(payload: PicksPayload): number[] {
    return [...payload.picks].sort((left, right) => left.position - right.position).map((pick) => pick.element);
}

export { orderedPickIds };
