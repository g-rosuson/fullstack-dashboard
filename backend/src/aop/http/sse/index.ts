import { Response } from 'express';

import type { EventType, EventTypeToPayloadMap } from 'aop/emitter/types';

const sendSSE = <T extends EventType>(res: Response, event: EventTypeToPayloadMap[T]) => {
    res.write(`event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`);
};

export { sendSSE };
