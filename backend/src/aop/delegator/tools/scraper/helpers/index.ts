import type { ScraperDescriptionSection, ScraperInformationItem } from '../types';

/**
 * Build a single plain-text body from structured sections + info rows, capped for persistence.
 * DOM-specific parsing stays in targets; this only formats the already-extracted structure.
 */
function formatListingBodyFromSections(
    sections: ScraperDescriptionSection[],
    infos: ScraperInformationItem[],
    maxChars: number
): string {
    const parts: string[] = [];

    for (const section of sections) {
        if (section.title) {
            parts.push(section.title);
        }
        parts.push(...section.blocks);
    }

    for (const info of infos) {
        parts.push(`${info.label}: ${info.value}`);
    }

    const full = parts.filter(Boolean).join('\n\n');
    if (full.length <= maxChars) {
        return full;
    }
    return full.slice(0, maxChars);
}

/**
 * Turns scraped info rows into the optional `fields` bag on a successful listing.
 *
 * - Rows with an empty or whitespace-only `label` use the key `"Field"` (still merges if repeated).
 * - When the same label appears more than once (e.g. multiple “Tag” spans), values are concatenated with `"; "` so nothing is silently overwritten.
 *
 * @param infos - Label/value pairs extracted by a target from portal-specific markup.
 * @returns Plain string map suitable for optional `fields` when the scraped item succeeds (`ok: true`).
 */
function informationsToFields(infos: ScraperInformationItem[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const { label, value } of infos) {
        const key = label.trim() === '' ? 'Field' : label;
        fields[key] = fields[key] !== undefined ? `${fields[key]}; ${value}` : value;
    }
    return fields;
}

const helpers = {
    formatListingBodyFromSections,
    informationsToFields,
};

export default helpers;
