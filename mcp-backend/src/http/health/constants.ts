/**
 * Mount prefix for the health router.
 */
const PATH = "/health";

/**
 * Liveness probe, relative to {@link PATH}.
 */
const LIVE = "/live";

/**
 * Readiness probe, relative to {@link PATH}.
 */
const READY = "/ready";

export { PATH, LIVE, READY };
