import { z } from "zod";
import { log } from "../../../log";

import { LOOPBACK_HOSTS } from "../constants";

/**
 * Splits a comma-separated hostname list and drops empty segments.
 */
function parseHostList(value: string | undefined): string[] | undefined {
    const hasValue = !!value;

    if (!hasValue) {
        return undefined;
    }

    const items = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    return items.length > 0 ? items : undefined;
}

/**
 * True when the bind address is loopback (localhost, 127.0.0.1, or ::1).
 */
function isLoopback(host: string): boolean {
    return (LOOPBACK_HOSTS as readonly string[]).includes(host);
}

/**
 * Writes env Zod failures as a single JSON log line, then the caller exits.
 */
function logEnvFailure(error: unknown): void {
    const issues = error instanceof z.ZodError ? error.issues : [{ message: String(error) }];

    log.error("invalid env", { issues });
}

export { isLoopback, logEnvFailure, parseHostList };
