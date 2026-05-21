---
name: api-client-patterns
description: Add new API resource functions, consume the REST client, handle CustomError, and implement SSE streams using fetch-event-source. Covers the api/service/client/rest.ts and stream.ts layers, per-resource function structure, Bearer token attachment, credentials:include, and event source teardown. Use when adding a new resource module, a new API function, or an SSE consumer.
---

# Purpose

Implement API calls and event streams through the established HTTP and SSE client layers — never via direct `fetch` in components.

# When To Use

- Adding a new API resource module under `api/service/resources/`.
- Adding a new function to an existing resource module.
- Implementing an SSE consumer for a backend stream endpoint.
- Debugging failed API calls or Bearer token attachment issues.

# Required Patterns

## REST client — use `api.service.client.*`

All HTTP calls go through `api/service/client/rest.ts`. The client:
- Reads `accessToken` from Zustand (`useStore.getState().accessToken`).
- Attaches `Authorization: Bearer <token>` when a token is present.
- Sets `credentials: 'include'` on every request (sends the refresh cookie).
- Parses non-2xx responses with `errorSchema` → throws `CustomError(message, issues)`.

Never use `fetch` or `axios` directly in components, hooks, or resource files.

## Per-resource module structure

```
api/service/resources/<resource>/
└── index.ts    Thin wrappers that call rest.get / rest.post / rest.put / rest.del
```

```typescript
// api/service/resources/jobs/index.ts
import { get, post, put, del } from '@/api/service/client/rest';
import type { CreateJobInput, Job, JobListResponse } from '@/_types/_gen';
import config from '@/config';

const create = async (body: CreateJobInput): Promise<{ success: true; data: Job }> =>
    post(config.routes.api.jobs.create, body);

const getAll = async (): Promise<JobListResponse> =>
    get(config.routes.api.jobs.getAll);

const remove = async (id: string): Promise<{ success: true; data: { id: string } }> =>
    del(`${config.routes.api.jobs.base}/${id}`);

export default { create, getAll, remove };
```

## Consuming the resource in components

```typescript
import api from '@/api';

// In onSubmit / event handler:
const response = await api.service.resources.jobs.create(payload);
```

## SSE streams — `api/service/client/stream.ts`

SSE streams use `@microsoft/fetch-event-source` instead of the native `EventSource` so the `Authorization` header can be attached:

```typescript
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useStore } from '@/store';

const streamJobs = (handlers: StreamHandlers, signal: AbortSignal) => {
    const accessToken = useStore.getState().accessToken;

    return fetchEventSource(buildUrl(config.routes.api.jobs.stream), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        signal,
        onmessage(event) {
            const data = JSON.parse(event.data);
            handlers.onEvent(data);
        },
        onerror(error) {
            handlers.onError(error);
        },
    });
};
```

Teardown: pass an `AbortSignal` from an `AbortController`. Call `controller.abort()` in the component's cleanup:

```typescript
useEffect(() => {
    const controller = new AbortController();
    api.service.client.stream.streamJobs(handlers, controller.signal);
    return () => controller.abort();
}, []);
```

## Error handling in consumers

```typescript
try {
    const response = await api.service.resources.jobs.create(payload);
    // success
} catch (error) {
    if (error instanceof CustomError) {
        // error.message — human-readable message
        // error.issues  — structured field-level issues from the backend
    }
    logging.error(error as Error);
}
```

# Implementation Steps

## Adding a new resource module

1. Create `api/service/resources/<resource>/index.ts`.
2. Import method helpers: `import { get, post, put, del } from '@/api/service/client/rest'`.
3. Import types from `@/_types/_gen` — regenerate if needed (`npm run generate-types`).
4. Write one thin function per endpoint; return the typed response.
5. Export a default object: `export default { create, getAll, ... }`.
6. Wire into `api/service/resources/index.ts` (or the equivalent barrel) so it's accessible via `api.service.resources.<resource>`.

## Adding a function to an existing resource

1. Add the function to `api/service/resources/<resource>/index.ts`.
2. Import any new types from `@/_types/_gen`.
3. Export the new function in the module's default export.

# Examples

## GET with query params

```typescript
const getAll = async (limit = 0, offset = 0): Promise<JobListResponse> =>
    get(`${config.routes.api.jobs.base}?limit=${limit}&offset=${offset}`);
```

## PUT (update)

```typescript
const update = async (id: string, body: UpdateJobInput): Promise<{ success: true; data: Job }> =>
    put(`${config.routes.api.jobs.base}/${id}`, body);
```

## DELETE

```typescript
const remove = async (id: string): Promise<{ success: true; data: { id: string } }> =>
    del(`${config.routes.api.jobs.base}/${id}`);
```

## Minimal SSE consumer in a component

```typescript
useEffect(() => {
    const controller = new AbortController();

    api.service.client.stream.streamJobs(
        {
            onEvent: (data) => { /* dispatch to state */ },
            onError: (error) => logging.error(error as Error),
        },
        controller.signal,
    );

    return () => controller.abort();
}, []);
```

# Edge Cases

- **Missing access token on first load**: `rest.ts` reads the token from `useStore.getState()`. On first page load before the `Authenticate` component refreshes the token, it may be null. The backend returns `401`; `rest.ts` throws `CustomError`. Handle in the consumer's `catch` block.
- **SSE reconnect**: `fetchEventSource` reconnects automatically on network interruption. The backend's replay logic sends previously emitted events on reconnect — no client-side replay logic is needed.
- **Route URL construction**: API route paths come from `config.routes.api.*`. Never hardcode URL strings in resource files.

# Anti-Patterns

- **Never** call `fetch` or `axios` directly in components or resource files.
- **Never** manually attach `Authorization` headers in resource files — `rest.ts` handles this.
- **Never** use the native `EventSource` API for SSE streams — it cannot send `Authorization` headers.
- **Never** define API payload or response types manually — import from `@/_types/_gen`.
- **Never** call `useStore(...)` inside resource functions — they are not React hooks. Use `useStore.getState()` for non-hook access (as `rest.ts` does).
- **Never** add API calls inside Zustand store slices.

# Validation Checklist

- [ ] Resource functions use `get`, `post`, `put`, `del` from `rest.ts`
- [ ] Types imported from `@/_types/_gen`, not manually defined
- [ ] SSE streams use `fetchEventSource` with `AbortSignal` for cleanup
- [ ] `AbortController.abort()` called in effect cleanup
- [ ] `CustomError` checked with `instanceof` in catch
- [ ] `logging.error` called for all caught errors
- [ ] No direct `fetch` calls outside `rest.ts` / `stream.ts`
- [ ] API route paths from `config.routes.*` — no hardcoded URLs
