import { Response } from 'express';

import type { EmitterEventMap, EventType } from 'aop/emitter/types';

type FlushableResponse = Response & { flush?: () => void };

/**
 * WebKit's fetch stream holds small chunks until a later packet arrives.
 * A comment this size forces each write over that threshold. Must not end
 * with a blank line — that would dispatch an empty frame and `JSON.parse`
 * would throw in the frontend stream client.
 */
const WEBKIT_COMMENT_PAD = `:${' '.repeat(2048)}\n`;

/**
 * Pushes buffered bytes to the client. `flush` is present when compression
 * (or a similar middleware) is mounted. `setNoDelay` disables Nagle so small
 * SSE frames are not delayed on the socket.
 */
const flushSSE = (res: FlushableResponse) => {
    res.flush?.();
    res.socket?.setNoDelay(true);
};

/**
 * Opens an SSE response: anti-buffering headers, then a WebKit-priming
 * comment that is **not** a dispatched frame (no trailing blank line).
 */
const openSSE = (res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(WEBKIT_COMMENT_PAD);
    flushSSE(res);
};

const sendSSE = <T extends EventType>(res: Response, event: EmitterEventMap[T]) => {
    res.write(`${WEBKIT_COMMENT_PAD}event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`);
    flushSSE(res);
};

export { openSSE, sendSSE };
