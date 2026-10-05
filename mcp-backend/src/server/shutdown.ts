import { log } from "../log";
import lifecycle from "../lifecycle";
import monitor from "../monitor";

interface ShutdownResources {
    stopListener: (() => Promise<void>) | null;
    closeMcp: (() => Promise<void>) | null;
    timeoutMs: number;
}

/**
 * Runs `work` and rejects with "shutdown timeout" if it does not settle in time.
 */
async function withTimeout(timeoutMs: number, work: () => Promise<void>): Promise<void> {
    const signal = AbortSignal.timeout(timeoutMs);

    await Promise.race([
        work(),
        new Promise<never>((_, reject) => {
            const onAbort = () => reject(new Error("shutdown timeout"));

            if (signal.aborted) {
                onAbort();
                return;
            }

            signal.addEventListener("abort", onAbort, { once: true });
        }),
    ]);
}

/**
 * Ordered teardown owned by server: not ready/live, drain HTTP, close MCP, flush Sentry, exit once.
 * Re-entry is a no-op via {@link lifecycle.markShuttingDown}. Does not live in lifecycle.
 */
async function shutdown(resources: ShutdownResources, exitCode: number): Promise<void> {
    if (lifecycle.markShuttingDown() === false) {
        return;
    }

    log.info("shutdown started", { exitCode });

    try {
        await withTimeout(resources.timeoutMs, async () => {
            await resources.stopListener?.();
            await resources.closeMcp?.();
            await monitor.close(resources.timeoutMs);
        });

        log.info("shutdown complete", { exitCode });
        process.exit(exitCode);
    } catch (error) {
        log.error("shutdown failed", { err: error });
        process.exit(1);
    }
}

export default shutdown;
export type { ShutdownResources };
