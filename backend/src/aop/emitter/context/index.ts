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
    getEmittedJobTargetEventsForUser;
    getEmittedPromptEventsForUser;

    /**
     * Creates a new EmitterContext instance with bound methods.
     * @param emitter Emitter singleton instance
     */
    constructor(emitter: Emitter) {
        this.emit = emitter.emit.bind(emitter);
        this.on = emitter.on.bind(emitter);
        this.off = emitter.off.bind(emitter);
        this.getEmittedJobTargetEventsForUser = emitter.getEmittedJobTargetEventsForUser.bind(emitter);
        this.getEmittedPromptEventsForUser = emitter.getEmittedPromptEventsForUser.bind(emitter);
    }
}
