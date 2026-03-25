import { InternalException } from 'aop/exceptions/errors/system';

import { ErrorMessage } from 'shared/enums/error-messages';
import { Tool } from 'shared/types/jobs/tools/types-tools';

/**
 * Adds a unique targetId to each target.
 *
 * Branching on `tool.type` is required — spreading a discriminated union
 * through `.map()` loses the discriminant, making the result unassignable
 * back to either union member without explicit narrowing.
 */
const mapToTargetIds = (tool: Tool): Tool => {
    if (tool.type === 'scraper') {
        return {
            ...tool,
            targets: tool.targets.map(target => ({ ...target, targetId: crypto.randomUUID() })),
        };
    }
    if (tool.type === 'email') {
        return {
            ...tool,
            targets: tool.targets.map(target => ({ ...target, targetId: crypto.randomUUID() })),
        };
    }

    // Compile-time exhaustiveness guard — errors here when a new Tool type is added but not handled
    tool satisfies never;

    throw new InternalException(ErrorMessage.UNHANDLED_TOOL_TYPE);
};

const helpers = {
    mapToTargetIds,
};

export default helpers;
