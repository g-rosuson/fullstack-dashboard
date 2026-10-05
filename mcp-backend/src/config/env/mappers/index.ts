import { version } from "../../../../package.json" with { type: "json" };
import { LOOPBACK_HOSTS } from "../constants";
import { parseHostList } from "../helpers";

import type { Config, RawEnv } from "../types";

/**
 * Builds {@link Config} from Zod-parsed env.
 *
 * HOST, PORT, LOG_LEVEL, and SHUTDOWN_TIMEOUT_MS are already the right types after
 * the object schema; they are copied through unchanged.
 *
 * MCP_ALLOWED_HOSTS and MCP_ALLOWED_ORIGINS arrive as comma-separated strings and
 * are split into hostname arrays. If MCP_ALLOWED_HOSTS is omitted on a loopback
 * HOST, {@link LOOPBACK_HOSTS} is used so Host-header checks still have an
 * allowlist. A non-loopback HOST without hosts is rejected in superRefine, not here.
 *
 * SENTRY_DSN: a blank string is treated as unset so Sentry stays off.
 * SENTRY_ENVIRONMENT: blank or omitted becomes production.
 * SENTRY_RELEASE: blank or omitted becomes package.json version.
 * SENTRY_TRACES_SAMPLE_RATE: when omitted, 0.1 if a DSN is set, otherwise 0.
 */
function toConfig(rawEnv: RawEnv): Config {
    const SENTRY_DSN = rawEnv.SENTRY_DSN || undefined;
    const hostsFromEnv = parseHostList(rawEnv.MCP_ALLOWED_HOSTS);

    return {
        HOST: rawEnv.HOST,
        PORT: rawEnv.PORT,
        LOG_LEVEL: rawEnv.LOG_LEVEL,
        MCP_ALLOWED_HOSTS: hostsFromEnv || [...LOOPBACK_HOSTS],
        MCP_ALLOWED_ORIGINS: parseHostList(rawEnv.MCP_ALLOWED_ORIGINS),
        SENTRY_DSN,
        SENTRY_ENVIRONMENT: rawEnv.SENTRY_ENVIRONMENT || "production",
        SENTRY_RELEASE: rawEnv.SENTRY_RELEASE || version,
        SENTRY_TRACES_SAMPLE_RATE: rawEnv.SENTRY_TRACES_SAMPLE_RATE ?? (SENTRY_DSN ? 0.1 : 0),
        SHUTDOWN_TIMEOUT_MS: rawEnv.SHUTDOWN_TIMEOUT_MS,
    };
}

export { toConfig };
