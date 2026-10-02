import * as Sentry from "@sentry/hono/bun";
import { sentry } from "@sentry/hono/bun";
import type { Env, Hono, MiddlewareHandler, Context, Next } from "hono";
import { BAGGAGE_META_KEY, TRACEPARENT_META_KEY } from "@modelcontextprotocol/server";
import { jsonRpcTraceSchema } from "./schemas";
import type { Config } from "../config/env/types";

/**
 * Sentry extras we skip: we already report crashes and shut down in `start()`,
 * and Hono already traces each request. Leaving these default integrations on would do both twice.
 */
const skippedDefaultIntegrations = ["OnUncaughtException", "OnUnhandledRejection", "BunServer"];

/**
 * W3C traceparent: `00-{32 hex trace id}-{16 hex parent span id}-{2 hex flags}`.
 * Flags `01` means sampled; `00` means not.
 */
const w3cTraceparent = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

/**
 * Reads W3C `traceparent` and `baggage` from JSON-RPC `_meta` (root or `params`).
 * Invalid bodies and malformed `_meta` yield empty fields; they are not errors.
 */
function readMetaTrace(body: unknown): { traceparent?: string; baggage?: string } {
    const parsed = jsonRpcTraceSchema.safeParse(body);

    if (!parsed.success) {
        return {};
    }

    const rootMeta = parsed.data._meta;
    const paramsMeta = parsed.data.params?._meta;

    return {
        traceparent: rootMeta?.[TRACEPARENT_META_KEY] ?? paramsMeta?.[TRACEPARENT_META_KEY],
        baggage: rootMeta?.[BAGGAGE_META_KEY] ?? paramsMeta?.[BAGGAGE_META_KEY],
    };
}

/**
 * Converts a W3C traceparent to Sentry's `sentry-trace` value (`{trace}-{span}-{0|1}`).
 * Strings that are already sentry-trace (or anything else) are returned unchanged.
 */
function traceFromTraceparent(traceparent: string): string {
    const match = w3cTraceparent.exec(traceparent);

    if (!match) {
        return traceparent;
    }

    const [, traceId, spanId, flags] = match;

    return `${traceId}-${spanId}-${flags === "01" ? "1" : "0"}`;
}

/**
 * Reports an exception to Sentry. No-op when Sentry was never inited.
 */
function captureException(error: unknown): void {
    Sentry.captureException(error);
}

/**
 * Flushes Sentry. No-op when Sentry was never inited.
 */
async function close(timeoutMs: number): Promise<void> {
    await Sentry.close(timeoutMs);
}

/**
 * Joins an incoming MCP trace for the duration of `next()`.
 *
 * MCP clients put W3C `traceparent` and `baggage` on JSON-RPC `_meta`, not on
 * HTTP headers. Sentry's Hono middleware never sees those fields, so spans and
 * errors inside the handler would otherwise start a new, disconnected trace.
 *
 * `traceparent` may be W3C (`00-…-01`) or already a Sentry `sentry-trace`.
 * No field means this request is the root.
 */
async function continueMetaTrace(context: Context, next: Next): Promise<void> {
    const { traceparent, baggage } = readMetaTrace(context.get("parsedBody"));

    if (!traceparent) {
        await next();
    } else {
        await Sentry.continueTrace({ sentryTrace: traceFromTraceparent(traceparent), baggage }, () => next());
    }
}

/**
 * Inits Sentry once (Hono Bun `sentry()` calls `init`), instruments Hono requests,
 * and joins an incoming MCP `_meta` trace for the duration of `next()`.
 *
 * MCP clients put W3C `traceparent` and `baggage` on JSON-RPC `_meta`, not on
 * HTTP headers. Sentry's Hono middleware never sees those fields, so spans and
 * errors inside the handler would otherwise start a new, disconnected trace.
 *
 * `traceparent` may be W3C (`00-…-01`) or already a Sentry `sentry-trace`.
 * No field means this request is the root.
 */
function middleware(app: Hono<Env>, config: Config): MiddlewareHandler {
    const sentryMiddleware = sentry(app, {
        dsn: config.SENTRY_DSN,
        environment: config.SENTRY_ENVIRONMENT,
        release: config.SENTRY_RELEASE,
        tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
        integrations: (defaults) => defaults.filter((integration) => !skippedDefaultIntegrations.includes(integration.name)),
    });

    return async (context: Context, next: Next) => {
        const nextCallback = () => continueMetaTrace(context, next);
        await sentryMiddleware(context, nextCallback);
    };
}

const monitor = {
    captureException,
    close,
    middleware,
};

export default monitor;
