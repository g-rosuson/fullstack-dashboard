import { Hono } from "hono";
import type { Context } from "hono";
import lifecycle from "../../lifecycle";
import { LIVE, READY } from "./constants";

/**
 * Live: 200 while the process is up, 503 after shutdown has started.
 */
function live(context: Context): Response {
    if (!lifecycle.isLive()) {
        return context.json({ status: "unavailable" }, 503);
    }

    return context.json({ status: "ok" });
}

/**
 * Ready: 200 only when the listener is up and shutdown has not started.
 */
function ready(context: Context): Response {
    if (!lifecycle.isReady()) {
        return context.json({ status: "unavailable" }, 503);
    }

    return context.json({ status: "ok" });
}

/**
 * Health router. Mount with `app.route(http.health.path, routes())`.
 * Paths here are relative to that prefix (`GET /live` → `GET /health/live`).
 */
function routes(): Hono {
    const router = new Hono();

    router.get(LIVE, live);
    router.get(READY, ready);

    return router;
}

export default routes;
