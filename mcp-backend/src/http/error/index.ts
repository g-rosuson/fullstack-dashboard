import type { Context } from "hono";
import { log } from "../../log";
import monitor from "../../monitor";
import request from "../request";

/**
 * Hono `onError` hook: log, capture to Sentry, return a generic 500 JSON body.
 * Responses already produced by handler.fetch do not reach this path.
 * `captureException` is a no-op when Sentry was never inited.
 */
function onError(error: Error, context: Context): Response {
    log.error("unhandled error", {
        requestId: request.getRequestId(),
        err: error,
    });

    monitor.captureException(error);

    return context.json({ error: "internal" }, 500);
}

export default onError;
