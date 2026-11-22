import type { McpStreamEvent } from '@/_types/_gen';

/**
 * A live step carries `promptId`. The connect snapshot does not.
 * @param event - The newest event on the open turn, if any.
 * @returns Whether that event is a step with a prompt id.
 */
const eventHasPromptId = (event: McpStreamEvent | undefined): event is McpStreamEvent & { promptId: string } =>
    Boolean(event && 'promptId' in event);

const turnIdsParam = 'turnIds';

/**
 * Reads the selected turn ids from the conversation URL.
 * Empty segments are dropped. Unknown and repeated ids are kept.
 * @param params - The current search params.
 * @returns Selected turn ids, in the order they appear.
 */
const readTurnIds = (params: URLSearchParams): string[] => {
    const value = params.get(turnIdsParam);

    if (!value) {
        return [];
    }

    return value.split(',').filter(turnId => turnId.length > 0);
};

/**
 * Writes the selected turn ids onto a copy of the search params.
 * An empty selection removes the param. Other params stay.
 * @param params - The current search params.
 * @param turnIds - Selected turn ids, in selection order.
 * @returns The next search params.
 */
const writeTurnIds = (params: URLSearchParams, turnIds: string[]): URLSearchParams => {
    const next = new URLSearchParams(params);

    if (turnIds.length === 0) {
        next.delete(turnIdsParam);
    } else {
        next.set(turnIdsParam, turnIds.join(','));
    }

    return next;
};

const helpers = {
    eventHasPromptId,
    readTurnIds,
    writeTurnIds,
};

export default helpers;
