import { AsyncLocalStorage } from "node:async_hooks";
import type { Context, Next } from "hono";
import { log } from "../../log";

/**
 * AsyncLocalStorage for request id.
 */
const requestIdStore = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Request id set by {@link middleware} for the current async work, if any.
 */
function getRequestId(): string | undefined {
    return requestIdStore.getStore()?.requestId;
}

async function middleware(context: Context, next: Next) {
    const requestId = crypto.randomUUID();
    context.set("requestId", requestId);

    const requestStartedAt = performance.now();

    await requestIdStore.run({ requestId }, async () => {
        try {
            await next();
        } finally {
            log.info("request", {
                requestId,
                method: context.req.method,
                path: context.req.path,
                mcpMethod: context.req.header("mcp-method"),
                mcpName: context.req.header("mcp-name"),
                status: context.res.status,
                durationMs: Math.round(performance.now() - requestStartedAt),
            });
        }
    });
}

const request = {
    getRequestId,
    middleware,
};

export default request;
