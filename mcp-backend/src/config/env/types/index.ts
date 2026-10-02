import type { LogLevel } from "../../../log";

/**
 * Env after the Zod object schema, before mapping to {@link Config}.
 * Host lists are still comma-separated strings; Sentry strings may be blank.
 */
interface RawEnv {
    HOST: string;
    PORT: number;
    LOG_LEVEL: LogLevel;
    MCP_ALLOWED_HOSTS?: string;
    MCP_ALLOWED_ORIGINS?: string;
    SENTRY_DSN?: string;
    SENTRY_ENVIRONMENT?: string;
    SENTRY_RELEASE?: string;
    SENTRY_TRACES_SAMPLE_RATE?: number;
    SHUTDOWN_TIMEOUT_MS: number;
}

/**
 * Runtime config loaded from process environment at start.
 * Keys match env var names. Host lists are parsed; blank SENTRY_DSN is unset.
 * Blank SENTRY_ENVIRONMENT becomes production; blank SENTRY_RELEASE becomes package.json version.
 */
interface Config {
    HOST: string;
    PORT: number;
    LOG_LEVEL: LogLevel;
    MCP_ALLOWED_HOSTS: string[];
    MCP_ALLOWED_ORIGINS: string[] | undefined;
    SENTRY_DSN: string | undefined;
    SENTRY_ENVIRONMENT: string;
    SENTRY_RELEASE: string;
    SENTRY_TRACES_SAMPLE_RATE: number;
    SHUTDOWN_TIMEOUT_MS: number;
}

export type { Config, RawEnv };
