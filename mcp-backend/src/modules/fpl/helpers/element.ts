import type { Element } from "../types";

/**
 * Web name for `id`, or `Player ${id}` when bootstrap has no such player.
 */
function elementName(elements: Map<number, Element>, id: number): string {
    return elements.get(id)?.web_name ?? `Player ${id}`;
}

export { elementName };
