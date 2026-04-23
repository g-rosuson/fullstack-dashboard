/**
 * HTTP methods
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Fetch options
 */
interface FetchOptions {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
}

/**
 * Event map
 */
type EventMap = Record<string, unknown>;

/**
 * Event map from union
 */
type EventMapFromUnion<T extends { type: string }> = {
    [E in T as E['type']]: E;
};

/**
 * Stream options
 */
interface StreamOptions<TEvents extends EventMap> {
    on?: { [K in keyof TEvents]?: (data: TEvents[K]) => void };
    onMessage?: (event: string, data: unknown) => void;
    onOpen?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    /** Override default retry interval in ms, or `false` to disable retries. */
    retry?: number | false;
    headers?: Record<string, string>;
}

/**
 * Stream subscription
 */
interface StreamSubscription {
    close: () => void;
}

export type { EventMap, EventMapFromUnion, FetchOptions, StreamOptions, StreamSubscription };
