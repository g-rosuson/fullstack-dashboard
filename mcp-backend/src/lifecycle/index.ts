let ready = false;
let shuttingDown = false;

/**
 * Live: the process is up and shutdown has not started.
 */
function isLive(): boolean {
    if (shuttingDown) {
        return false;
    }

    return true;
}

/**
 * Ready: the listener is up and shutdown has not started.
 */
function isReady(): boolean {
    if (shuttingDown) {
        return false;
    }

    return ready;
}

function markReady(): void {
    ready = true;
}

/**
 * Flips ready and live off. Returns false when shutdown was already marked.
 */
function markShuttingDown(): boolean {
    if (shuttingDown) {
        return false;
    }

    shuttingDown = true;
    ready = false;

    return true;
}

const lifecycle = {
    isLive,
    isReady,
    markReady,
    markShuttingDown,
};

export default lifecycle;
