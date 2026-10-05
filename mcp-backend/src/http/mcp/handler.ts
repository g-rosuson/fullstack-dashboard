import { createMcpHandler } from "@modelcontextprotocol/server";
import mcp from "../../mcp";
import monitor from "../../monitor";
import { log } from "../../log";
import request from "../request";

import type { Config } from "../../config/env/types";

/**
 * HTTP adapter around {@link mcp.createServer}. Tools live in `modules`, not here.
 * Validates the module catalog once; each POST still gets a fresh MCP server.
 */
function createHandler(config: Config) {
    mcp.validateModules();

    const handlerOptions = {
        responseMode: "json" as const,
        legacy: "reject" as const,
        onerror: (error: Error) => {
            log.error("mcp handler error", { requestId: request.getRequestId(), err: error });

            if (config.SENTRY_DSN) {
                monitor.captureException(error);
            }
        },
    };

    return createMcpHandler(mcp.createServer, handlerOptions);
}

export { createHandler };
