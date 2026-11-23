import { NotFoundError } from "../../../errors";
import { operatorEntryId, readEntry } from "../client";
import { MANAGER_NOT_FOUND, MISSING_ENTRY_ID } from "../constants/messages";
import { replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapEntry } from "../mappers";

import type { EntryInput, ToolResult } from "../types";

/**
 * Returns a manager's team name, points, rank, and classic-league ids.
 * Defaults to `FPL_ENTRY_ID` when no manager is supplied.
 * A missing operator team and an unknown id are tool errors.
 */
async function entry(input: EntryInput): Promise<ToolResult> {
    const entryId = input.entry_id ?? operatorEntryId();

    if (entryId === undefined) {
        return toolError(MISSING_ENTRY_ID);
    }

    try {
        const payload = await readEntry(entryId);

        return toolJson(mapEntry(payload));
    } catch (error) {
        if (error instanceof NotFoundError) {
            return toolError(replacePlaceholder(MANAGER_NOT_FOUND, { entryId }));
        }

        return toolFailure(error);
    }
}

export { entry };
