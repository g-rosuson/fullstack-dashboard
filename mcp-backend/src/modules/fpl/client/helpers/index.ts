import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Dotenv path for this process: the `.env` file in the working directory.
 */
function defaultDotenvPath(): string {
    return join(process.cwd(), ".env");
}

/**
 * Rewrites the `FPL_REFRESH_TOKEN` line, appending it when the file has none.
 * Throws when `path` cannot be read or written.
 */
function rewriteEnvFile(path: string, token: string): void {
    const existing = readFileSync(path, "utf8");
    const lines = existing.split("\n");
    let found = false;

    const next = lines.map((line) => {
        if (!line.startsWith("FPL_REFRESH_TOKEN=")) {
            return line;
        }

        found = true;
        return `FPL_REFRESH_TOKEN=${token}`;
    });

    if (!found) {
        if (next.length > 0 && next[next.length - 1] === "") {
            next.splice(next.length - 1, 0, `FPL_REFRESH_TOKEN=${token}`);
        } else {
            next.push(`FPL_REFRESH_TOKEN=${token}`);
        }
    }

    writeFileSync(path, next.join("\n"));
}

export { defaultDotenvPath, rewriteEnvFile };
