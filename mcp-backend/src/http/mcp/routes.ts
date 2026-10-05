import { Hono } from "hono";
import type { Context } from "hono";
import type { McpHttpHandler } from "@modelcontextprotocol/server";

/**
 * Answers GET/DELETE with 405 and Allow: POST for the JSON MCP transport.
 */
function methodNotAllowed(context: Context): Response {
    context.header("Allow", "POST");

    return context.body(null, 405);
}

/**
 * MCP router. Mount with `app.route(http.mcp.path, routes(handler))`.
 * Paths here are relative to that prefix (`POST` → `POST /mcp`).
 */
function routes(mcpHandler: McpHttpHandler): Hono {
    const router = new Hono();

    router.post((context: Context) => mcpHandler.fetch(context.req.raw, { parsedBody: context.get("parsedBody") }));
    router.get(methodNotAllowed);
    router.delete(methodNotAllowed);

    return router;
}

export default routes;
