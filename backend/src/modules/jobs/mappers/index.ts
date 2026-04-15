import { InternalException } from 'aop/exceptions/errors/system';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { CreateJobTool, UpdateJobTool } from '../types';
import type { Tool } from 'shared/types/jobs/tools/types-tools';

/**
 * Ensures each tool and its targets have stable IDs.
 *
 * - Reuses existing `toolId` / `targetId` when present (update flow)
 * - Generates new IDs when missing (create flow)
 *
 * Branching on `tool.type` is required to preserve proper narrowing of the
 * discriminated union. Without it, spreading and mapping would widen the type,
 * making the result incompatible with the `Tool` union.
 */
const mapToIds = (tool: CreateJobTool | UpdateJobTool): Tool => {
    const toolId = 'toolId' in tool && tool.toolId ? tool.toolId : crypto.randomUUID();

    if (tool.type === 'scraper') {
        return {
            ...tool,
            toolId,
            targets: tool.targets.map(target => ({
                ...target,
                targetId: 'targetId' in target && target.targetId ? target.targetId : crypto.randomUUID(),
            })),
        };
    }
    if (tool.type === 'email') {
        return {
            ...tool,
            toolId,
            targets: tool.targets.map(target => ({
                ...target,
                targetId: 'targetId' in target && target.targetId ? target.targetId : crypto.randomUUID(),
            })),
        };
    }

    // Compile-time exhaustiveness guard — errors here when a new Tool type is added but not handled
    tool satisfies never;

    throw new InternalException(ErrorMessage.UNHANDLED_TOOL_TYPE);
};

const helpers = {
    mapToIds,
};

export default helpers;
