import { Response } from 'express';

import type { EventType } from 'aop/emitter/types';

import type { EventTypeToPayloadMap } from 'shared/types/jobs/events/types-jobs-events';

const sendSSE = <T extends EventType>(res: Response, event: EventTypeToPayloadMap[T]) => {
    res.write(`event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`);
};

export { sendSSE };
