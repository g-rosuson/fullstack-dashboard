import { UpstreamError } from "../../../errors";
import { PITCH_SLOT_COUNT } from "../constants";
import { UPSTREAM_UNUSABLE } from "../constants/messages";
import { byId } from "../helpers/byId";
import { elementName } from "../helpers/element";

import type { Bootstrap, PicksPayload, PicksView } from "../types";

/**
 * Starters, bench, captain, vice-captain, chip, and gameweek points.
 * Names come from bootstrap. Throws {@link UpstreamError} when the lineup has no captain or vice-captain.
 */
function mapPicks(payload: PicksPayload, bootstrap: Bootstrap): PicksView {
    const elements = byId(bootstrap.elements);
    const ordered = [...payload.picks].sort((left, right) => left.position - right.position);
    const captain = ordered.find((pick) => pick.is_captain);
    const vice = ordered.find((pick) => pick.is_vice_captain);

    if (!captain || !vice) {
        throw new UpstreamError(UPSTREAM_UNUSABLE);
    }

    return {
        starters: ordered.filter((pick) => pick.position <= PITCH_SLOT_COUNT).map((pick) => elementName(elements, pick.element)),
        bench: ordered.filter((pick) => pick.position > PITCH_SLOT_COUNT).map((pick) => elementName(elements, pick.element)),
        captain: elementName(elements, captain.element),
        vice_captain: elementName(elements, vice.element),
        active_chip: payload.active_chip,
        gameweek_points: payload.entry_history.points,
    };
}

export { mapPicks };
