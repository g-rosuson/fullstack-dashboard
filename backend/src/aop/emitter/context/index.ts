import { Emitter } from 'aop/emitter';

/**
 * EmitterContext exposes emitter capabilities to the HTTP layer.
 * It provides a thin wrapper around the emitter singleton so that
 * request handlers can trigger background jobs in a consistent way.
 */
export class EmitterContext {
    emit;
    on;
    off;
    allEmittedJobTargetEvents;

    /**
     * Creates a new EmitterContext instance with bound methods.
     * @param emitter Emitter singleton instance
     */
    constructor(emitter: Emitter) {
        this.emit = emitter.emit;
        this.on = emitter.on;
        this.off = emitter.off;
        this.allEmittedJobTargetEvents = emitter.allEmittedJobTargetEvents;
    }
}
