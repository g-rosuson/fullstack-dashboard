import { BAGGAGE_META_KEY, TRACEPARENT_META_KEY } from "@modelcontextprotocol/server";
import { z } from "zod";

/**
 * Optional MCP `_meta` that may carry W3C `traceparent` and `baggage`.
 * Invalid values become undefined so a bad root `_meta` does not hide `params._meta`.
 */
const metaWithTraceSchema = z
    .object({
        [TRACEPARENT_META_KEY]: z.string().optional(),
        [BAGGAGE_META_KEY]: z.string().optional(),
    })
    .optional()
    .catch(undefined);

/**
 * JSON-RPC body fragment: trace fields live on `_meta`, not HTTP headers.
 */
const jsonRpcTraceSchema = z.object({
    _meta: metaWithTraceSchema,
    params: z
        .object({
            _meta: metaWithTraceSchema,
        })
        .optional()
        .catch(undefined),
});

export { jsonRpcTraceSchema };
