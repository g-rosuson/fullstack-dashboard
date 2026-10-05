import { createMcpHonoApp } from "@modelcontextprotocol/hono";

import monitor from "../monitor";
import http from "../http";
import lifecycle from "../lifecycle";
import { log } from "../log";
import shutdown, { type ShutdownResources } from "./shutdown";

import type { Config } from "../config/env/types";

/**
 * Composes Hono, listens, marks ready, and installs signal/fatal hooks onto {@link shutdown}.
 * A throw before listen is caught here and uses the same teardown with whatever was created.
 */
async function start(config: Config): Promise<void> {
    const shutdownResources: ShutdownResources = {
        stopListener: null,
        closeMcp: null,
        timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
    };

    try {
        // Create the MCP Hono app
        const app = createMcpHonoApp({
            host: config.HOST,
            allowedHosts: config.MCP_ALLOWED_HOSTS,
            ...(config.MCP_ALLOWED_ORIGINS ? { allowedOrigins: config.MCP_ALLOWED_ORIGINS } : {}),
        });

        // Add middleware
        if (config.SENTRY_DSN) {
            app.use(monitor.middleware(app, config));
        }

        app.use(http.request.middleware);

        // Add routes
        app.route(http.health.path, http.health.routes());

        const mcpHandler = http.mcp.createHandler(config);
        shutdownResources.closeMcp = () => mcpHandler.close();
        app.route(http.mcp.path, http.mcp.routes(mcpHandler));

        // Add error handler
        app.onError(http.onError);

        // Create the server
        const server = Bun.serve({
            hostname: config.HOST,
            port: config.PORT,
            fetch: app.fetch,
            idleTimeout: 30,
        });

        // Add shutdown resources
        shutdownResources.stopListener = () => server.stop();

        // Mark the server as ready
        lifecycle.markReady();

        log.info("listening", {
            host: config.HOST,
            port: server.port,
        });

        // Add signal handlers for shutdown processes
        process.once("SIGTERM", () => void shutdown(shutdownResources, 0));
        process.once("SIGINT", () => void shutdown(shutdownResources, 0));

        process.on("uncaughtException", (error) => {
            log.error("uncaught exception", { err: error });
            monitor.captureException(error);
            void shutdown(shutdownResources, 1);
        });

        process.on("unhandledRejection", (reason) => {
            log.error("unhandled rejection", { err: reason });
            monitor.captureException(reason);
            void shutdown(shutdownResources, 1);
        });
    } catch (error) {
        log.error("start failed", { err: error });
        monitor.captureException(error);
        await shutdown(shutdownResources, 1);
    }
}

const server = {
    start,
};

export default server;
