import { NotFoundError } from "../../../errors";
import { operatorEntryId, operatorRefreshToken, readBootstrap, readSquad } from "../client";
import { MANAGER_NOT_FOUND, MISSING_ENTRY_ID, MISSING_REFRESH_TOKEN } from "../constants/messages";
import { replacePlaceholder, toolError, toolFailure, toolJson } from "../helpers";
import { mapSquad } from "../mappers";

import type { ToolResult } from "../types";

/**
 * Returns the operator's bank, squad value, free transfers, players, and chips.
 * Requires `FPL_REFRESH_TOKEN` and `FPL_ENTRY_ID`.
 * A rotated refresh token is kept for later calls in this process.
 * Missing credentials and upstream failures are tool errors.
 */
async function squad(): Promise<ToolResult> {
    if (!operatorRefreshToken()) {
        return toolError(MISSING_REFRESH_TOKEN);
    }

    const entryId = operatorEntryId();

    if (entryId === undefined) {
        return toolError(MISSING_ENTRY_ID);
    }

    try {
        const data = await readBootstrap();
        const payload = await readSquad(entryId);

        return toolJson(mapSquad(payload, data));
    } catch (error) {
        if (error instanceof NotFoundError) {
            return toolError(replacePlaceholder(MANAGER_NOT_FOUND, { entryId }));
        }

        return toolFailure(error);
    }
}

export { squad };
