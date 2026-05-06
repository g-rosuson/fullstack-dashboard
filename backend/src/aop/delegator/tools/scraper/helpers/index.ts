import type { ScraperDescriptionSection, ScraperInformationRow } from '../types';
import type { ScraperToolTargetName } from 'shared/types/jobs/tools/types-tools-scraper';

import { createHash } from 'node:crypto';

/**
 * Normalise a URL for stable keys (strip hash; full href when parseable).
 */
function normalizeUrlForListingKey(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
        return '';
    }
    try {
        const u = new URL(trimmed);
        u.hash = '';
        return u.href;
    } catch {
        return trimmed;
    }
}

/**
 * Stable id for a listing from portal + URL (used for rows and dedupe).
 */
function listingKeyFrom(source: ScraperToolTargetName, url: string): string {
    const normalized = normalizeUrlForListingKey(url);
    return createHash('sha256').update(`${source}\n${normalized}`).digest('hex');
}

/**
 * Build a single plain-text body from structured sections + info rows, capped for persistence.
 * DOM-specific parsing stays in targets; this only formats the already-extracted structure.
 */
function formatListingBodyFromSections(
    sections: ScraperDescriptionSection[],
    infos: ScraperInformationRow[],
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
function informationsToFields(infos: ScraperInformationRow[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const { label, value } of infos) {
        const key = label.trim() === '' ? 'Field' : label;
        fields[key] = fields[key] !== undefined ? `${fields[key]}; ${value}` : value;
    }
    return fields;
}

export { listingKeyFrom, formatListingBodyFromSections, informationsToFields, normalizeUrlForListingKey };
