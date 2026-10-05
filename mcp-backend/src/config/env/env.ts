import { log } from "../../log";
import { logEnvFailure } from "./helpers";
import { envSchema } from "./schemas";

import type { Config } from "./types";

/**
 * Parses a key/value env map into {@link Config}. Throws ZodError when invalid.
 */
function parseEnv(source: Record<string, string | undefined>): Config {
    return envSchema.parse(source);
}

/**
 * Loads config from process env, applies LOG_LEVEL, and logs host/port/sentry.
 * On failure, logs field errors as JSON and exits 1.
 */
function loadConfig(): Config {
    try {
        const config = parseEnv(process.env);

        log.setLevel(config.LOG_LEVEL);

        log.info("config ok", {
            host: config.HOST,
            port: config.PORT,
            sentry: Boolean(config.SENTRY_DSN),
        });

        return config;
    } catch (error) {
        logEnvFailure(error);
        process.exit(1);
    }
}

export { loadConfig, parseEnv };
