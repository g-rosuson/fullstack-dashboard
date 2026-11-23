import { byId } from "../helpers/byId";
import { elementName } from "../helpers/element";
import { millions } from "../helpers/money";
import { teamName } from "../helpers/team";
import { freeTransfers } from "../helpers/transfer";

import type { Bootstrap, SquadPayload, SquadView } from "../types";

/**
 * Operator bank, squad value, free transfers, players, and chips. Prices are in millions.
 */
function mapSquad(payload: SquadPayload, bootstrap: Bootstrap): SquadView {
    const teams = byId(bootstrap.teams);
    const positions = byId(bootstrap.element_types);
    const elements = byId(bootstrap.elements);
    const players = [...payload.picks].sort((left, right) => left.position - right.position);

    return {
        bank: millions(payload.transfers.bank),
        squad_value: millions(payload.transfers.value),
        free_transfers: freeTransfers(payload.transfers.limit, payload.transfers.made),
        players: players.map((pick) => {
            const element = elements.get(pick.element);
            const role = element ? positions.get(element.element_type) : undefined;

            return {
                name: elementName(elements, pick.element),
                club: element ? teamName(teams, element.team) : "Unknown",
                position: role?.singular_name ?? "Unknown",
                slot: pick.position,
                price: millions(pick.purchase_price),
            };
        }),
        chips: mapChips(payload.chips),
    };
}

/**
 * Splits chips into those still available and those used or active this season.
 */
function mapChips(chips: SquadPayload["chips"]): SquadView["chips"] {
    const available: string[] = [];
    const used: string[] = [];

    for (const chip of chips) {
        if (chip.status_for_entry === "available") {
            available.push(chip.name);
            continue;
        }

        if (chip.status_for_entry === "used" || chip.status_for_entry === "active") {
            used.push(chip.name);
        }
    }

    return { available, used };
}

export { mapSquad };
