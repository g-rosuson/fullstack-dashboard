import { z } from "zod";
import { logLevels } from "../../../log";
import { isLoopback, parseHostList } from "../helpers";
import { toConfig } from "../mappers";

/**
 * Zod schema for platform env. Required keys have no defaults; optional keys may be omitted.
 */
const envSchema = z
    .object({
        HOST: z.string().min(1),
        PORT: z.coerce.number().int().positive(),
        LOG_LEVEL: z.enum(logLevels),
        MCP_ALLOWED_HOSTS: z.string().optional(),
        MCP_ALLOWED_ORIGINS: z.string().optional(),
        SENTRY_DSN: z.string().optional(),
        SENTRY_ENVIRONMENT: z.string().optional(),
        SENTRY_RELEASE: z.string().optional(),
        SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
        SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive(),
    })
    .superRefine((rawEnv, context) => {
        const dsnRaw = rawEnv.SENTRY_DSN || undefined;

        if (dsnRaw && !z.url().safeParse(dsnRaw).success) {
            context.addIssue({
                code: "custom",
                path: ["SENTRY_DSN"],
                message: "Must be a URL",
            });
        }

        const environmentRaw = rawEnv.SENTRY_ENVIRONMENT || undefined;

        if (environmentRaw && (environmentRaw === "None" || environmentRaw.length > 64 || /[\s/]/.test(environmentRaw))) {
            context.addIssue({
                code: "custom",
                path: ["SENTRY_ENVIRONMENT"],
                message: "Must be at most 64 characters, not None, and must not contain spaces or slashes",
            });
        }

        const hostsFromEnv = parseHostList(rawEnv.MCP_ALLOWED_HOSTS);

        if (!isLoopback(rawEnv.HOST) && hostsFromEnv === undefined) {
            context.addIssue({
                code: "custom",
                path: ["MCP_ALLOWED_HOSTS"],
                message: "Required when HOST is not a loopback address",
            });
        }
    })
    .transform(toConfig);

export { envSchema };
