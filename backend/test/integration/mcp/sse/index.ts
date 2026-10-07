import constants from 'shared/constants';

import type { getAgent } from '../../harness';
import type { IncomingMessage } from 'http';

type McpStreamEvent = {
    event: string;
    data: Record<string, unknown>;
};

type Agent = ReturnType<typeof getAgent>;

type McpStream = {
    status: number;
    headers: IncomingMessage['headers'];
    events: () => McpStreamEvent[];
    // eslint-disable-next-line no-unused-vars
    waitFor: (match: (event: McpStreamEvent) => boolean, timeoutMs?: number) => Promise<McpStreamEvent>;
    close: () => void;
};

/**
 * Parses an SSE buffer into event/data pairs. Comment lines are ignored.
 *
 * @param buffer Bytes read from the stream so far
 * @returns Events in arrival order
 */
const parseMcpEvents = (buffer: string): McpStreamEvent[] =>
    buffer
        .split('\n\n')
        .filter(Boolean)
        .flatMap(chunk => {
            const lines = chunk.split('\n').filter(line => line !== '' && !line.startsWith(':'));
            const eventLine = lines.find(line => line.startsWith('event: '));
            const dataLine = lines.find(line => line.startsWith('data: '));

            if (!eventLine || !dataLine) {
                return [];
            }

            return [
                {
                    event: eventLine.replace('event: ', ''),
                    data: JSON.parse(dataLine.replace('data: ', '')) as Record<string, unknown>,
                },
            ];
        });

/**
 * Opens `GET /api/mcp/stream` and leaves it open until `close`.
 * `waitFor` resolves when an event already buffered, or one that arrives later, matches.
 *
 * @param agent Supertest client bound to the app
 * @param token Access token for this user
 * @returns The open stream
 */
const openMcpStream = (agent: Agent, token: string): Promise<McpStream> =>
    new Promise((resolve, reject) => {
        let buffer = '';
        let settled = false;
        let response: IncomingMessage | undefined;
        const waiters: Array<{
            // eslint-disable-next-line no-unused-vars
            match: (event: McpStreamEvent) => boolean;
            // eslint-disable-next-line no-unused-vars
            resolve: (event: McpStreamEvent) => void;
            // eslint-disable-next-line no-unused-vars
            reject: (error: Error) => void;
            timer: ReturnType<typeof setTimeout>;
        }> = [];

        /**
         * Rejects the open and closes the socket. A later error is ignored.
         *
         * @param error Why the stream failed
         */
        const fail = (error: Error) => {
            if (settled) {
                return;
            }

            settled = true;
            response?.destroy();
            reject(error);
        };

        /**
         * Resolves waiters whose event is already in the buffer.
         */
        const pump = () => {
            const events = parseMcpEvents(buffer);

            for (const waiter of [...waiters]) {
                const matched = events.find(waiter.match);

                if (!matched) {
                    continue;
                }

                clearTimeout(waiter.timer);
                waiters.splice(waiters.indexOf(waiter), 1);
                waiter.resolve(matched);
            }
        };

        const req = agent.get(constants.routes.mcp.stream).set('Authorization', `Bearer ${token}`).buffer(false);

        req.on('response', (res: IncomingMessage) => {
            response = res;
            res.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                pump();
            });
            res.on('error', error => {
                if (!settled) {
                    fail(error);
                }
            });
            settled = true;
            resolve({
                status: res.statusCode ?? 0,
                headers: res.headers,
                /**
                 * Events received so far. Comment lines are ignored.
                 *
                 * @returns Events in arrival order
                 */
                events: () => parseMcpEvents(buffer),
                /**
                 * Resolves when a buffered or later event matches.
                 *
                 * @param match Predicate over one event
                 * @param timeoutMs How long to wait. 10 seconds when omitted
                 * @returns The matching event
                 */
                waitFor: (match, timeoutMs = 10_000) =>
                    new Promise((resolveEvent, rejectEvent) => {
                        const events = parseMcpEvents(buffer);
                        const existing = events.find(match);

                        if (existing) {
                            resolveEvent(existing);

                            return;
                        }

                        const timer = setTimeout(() => {
                            waiters.splice(
                                waiters.findIndex(waiter => waiter.timer === timer),
                                1
                            );
                            rejectEvent(
                                new Error(
                                    `SSE timeout. Seen: ${parseMcpEvents(buffer)
                                        .map(event => event.event)
                                        .join(',')}`
                                )
                            );
                        }, timeoutMs);

                        waiters.push({ match, resolve: resolveEvent, reject: rejectEvent, timer });
                    }),
                /**
                 * Closes the socket. The server drops its listeners.
                 */
                close: () => {
                    response?.destroy();
                },
            });
        });

        req.on('error', error => fail(error));
        req.end((error: Error | undefined) => {
            if (error && !error.message.includes('aborted')) {
                fail(error);
            }
        });
    });

export type { Agent, McpStream, McpStreamEvent };
export { openMcpStream, parseMcpEvents };
