type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
}

type EventMap = Record<string, unknown>;

type EventMapFromUnion<T extends { type: string }> = {
    [E in T as E['type']]: E;
};

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

interface StreamSubscription {
    close: () => void;
}

export type { EventMap, EventMapFromUnion, FetchOptions, StreamOptions, StreamSubscription };
