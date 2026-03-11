import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source';

import logging from 'services/logging';
import { useStore } from 'store';

import type { EventMap, StreamOptions, StreamSubscription } from './types';

import { buildUrl } from './utils';

// TODO: Extend exceptions system
class RetriableError extends Error {}
class FatalError extends Error {}

/**
 * Opens an authenticated SSE connection to the given API path.
 *
 * Incoming messages are routed by their SSE `event` field to the matching
 * handler in `options.on`. Unmatched events fall through to `options.onMessage`.
 *
 * - 4xx errors (except 429) are treated as fatal and stop the connection.
 * - All other errors trigger an automatic retry (configurable via `options.retry`).
 *
 * @param path    API path (relative to the backend root URL).
 * @param options Typed event handlers, lifecycle callbacks, and retry config.
 * @returns A subscription handle whose `close()` method aborts the connection.
 */
const stream = <TEvents extends EventMap>(path: string, options: StreamOptions<TEvents>): StreamSubscription => {
    const ctrl = new AbortController();
    const accessToken = useStore.getState().accessToken;

    fetchEventSource(buildUrl(path), {
        method: 'GET',
        headers: {
            ...(!!accessToken && { Authorization: `Bearer ${accessToken}` }),
            ...options.headers,
        },
        signal: ctrl.signal,

        async onopen(response) {
            if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
                options.onOpen?.();
                return;
            }

            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                throw new FatalError(`Non-retriable ${response.status}`);
            }

            throw new RetriableError(`Retriable ${response.status}`);
        },

        onmessage(msg) {
            if (msg.event === 'FatalError') {
                throw new FatalError(msg.data);
            }

            const handler = options.on?.[msg.event as keyof TEvents];

            if (handler) {
                handler(JSON.parse(msg.data) as TEvents[keyof TEvents]);
                return;
            }

            options.onMessage?.(msg.event, JSON.parse(msg.data));
        },

        onclose() {
            options.onClose?.();
            throw new RetriableError();
        },

        onerror(err) {
            if (err instanceof FatalError) {
                options.onError?.(err);
                throw err;
            }

            logging.error(err instanceof Error ? err : new Error(String(err)));

            if (options.retry === false) {
                throw err;
            }

            return options.retry;
        },
    });

    return { close: () => ctrl.abort() };
};

export { stream };
