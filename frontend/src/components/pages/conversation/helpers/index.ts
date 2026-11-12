import type { McpStreamEvent } from '@/_types/_gen';

/**
 * A live step carries `promptId`. The connect snapshot does not.
 * @param event - The newest event on the open turn, if any.
 * @returns Whether that event is a step with a prompt id.
 */
const eventHasPromptId = (event: McpStreamEvent | undefined): event is McpStreamEvent & { promptId: string } =>
    Boolean(event && 'promptId' in event);

const helpers = {
    eventHasPromptId,
};

export default helpers;
