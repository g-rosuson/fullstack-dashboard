import constants from 'shared/constants';

import type { EventType, EventTypeToPayloadMap, JobTargetFinishedEvent } from './types';

import { EventEmitter } from 'events';

/**
 * Emitter is a singleton that emits events.
 */
class Emitter {
    private static instance: Emitter | null = null;
    private emitter = new EventEmitter();
    private emittedJobTargetEvents: JobTargetFinishedEvent[] = [];

    private constructor() {
        this.emit = this.emit.bind(this);
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
    }

    /**
     * Returns the singleton instance of Emitter.
     * Creates a new instance if one doesn't exist.
     *
     * @returns The singleton Emitter instance
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new Emitter();
        }

        return this.instance;
    }

    /**
     * Emits an event and stores it in the emittedJobTargetEvents array.
     *
     * @param eventType The type of the event
     * @param event The event to emit
     */
    public emit<T extends EventType>(eventType: T, event: EventTypeToPayloadMap[T]) {
        this.emitter.emit(eventType, event);

        if (eventType === constants.events.jobs.targetFinished) {
            const typedEvent = event as JobTargetFinishedEvent;
            this.emittedJobTargetEvents.push(typedEvent);
        }
    }

    /**
     * Adds a listener for an event.
     *
     * @param eventType The type of the event
     * @param callback The callback to add
     */
    // eslint-disable-next-line no-unused-vars
    public on<T extends EventType>(eventType: T, callback: (event: EventTypeToPayloadMap[T]) => void) {
        this.emitter.on(eventType, callback);
    }

    /**
     * Removes a listener for an event.
     *
     * @param eventType The type of the event
     * @param callback The callback to remove
     */
    // eslint-disable-next-line no-unused-vars
    public off<T extends EventType>(eventType: T, callback: (event: EventTypeToPayloadMap[T]) => void) {
        this.emitter.off(eventType, callback);
    }

    /**
     * Clears all events for a job.
     *
     * @param jobId The ID of the job
     */
    public clearJobTargetEvents(jobId: string) {
        this.emittedJobTargetEvents = this.emittedJobTargetEvents.filter(event => event.jobId !== jobId);
    }

    /**
     * Returns all target events.
     *
     * @returns All target events
     */
    get allEmittedJobTargetEvents(): ReadonlyArray<JobTargetFinishedEvent> {
        return [...this.emittedJobTargetEvents];
    }
}

export { Emitter };
