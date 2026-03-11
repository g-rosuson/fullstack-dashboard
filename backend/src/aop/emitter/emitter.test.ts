import type { EventType, JobTargetFinishedEvent } from './types';

import { Emitter } from './';

/**
 * Mocks for the event types.
 */
const mockEvent = 'test-event' as unknown as EventType;
const mockJobTargetFinishedEvent = 'job-target-finished';

/**
 * Mocks for the emit payload.
 */
const mockEmitPayload = {
    jobId: 'test-job-id',
    targetId: 'test-target-id',
} as unknown as JobTargetFinishedEvent;
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const callback = vi.fn();

vi.mock('events', () => ({
    EventEmitter: vi.fn(() => ({
        emit: mockEmit,
        on: mockOn,
        off: mockOff,
    })),
}));

describe('Emitter', () => {
    let emitter: Emitter;

    beforeEach(() => {
        // @ts-expect-error - accessing private static property for testing
        Emitter.instance = null;

        emitter = Emitter.getInstance();

        vi.clearAllMocks();
    });

    describe('getInstance', () => {
        it('returns the same instance on multiple calls', () => {
            const firstInstance = Emitter.getInstance();
            const secondInstance = Emitter.getInstance();

            expect(firstInstance).toBe(secondInstance);
        });
    });

    describe('emit', () => {
        it('handles job-target-finished events correctly', () => {
            emitter.emit(mockJobTargetFinishedEvent, mockEmitPayload);

            expect(emitter.allEmittedJobTargetEvents).toContain(mockEmitPayload);
            expect(mockEmit).toHaveBeenCalledWith(mockJobTargetFinishedEvent, mockEmitPayload);
        });
        it('emits events correctly', () => {
            emitter.emit(mockEvent, mockEmitPayload);

            expect(emitter.allEmittedJobTargetEvents).not.toContain(mockEmitPayload);
            expect(mockEmit).toHaveBeenCalledWith(mockEvent, mockEmitPayload);
        });
    });

    describe('on', () => {
        it('adds a listener correctly', () => {
            emitter.on(mockEvent, callback);

            expect(mockOn).toHaveBeenCalledWith(mockEvent, callback);
        });
    });

    describe('off', () => {
        it('removes a listener correctly', () => {
            emitter.off(mockEvent, callback);

            expect(mockOff).toHaveBeenCalledWith(mockEvent, callback);
        });
    });

    describe('clearJobTargetEvents', () => {
        it('clears all events for a job correctly', () => {
            emitter.emit(mockEvent, mockEmitPayload);
            emitter.emit(mockEvent, mockEmitPayload);
            emitter.clearJobTargetEvents(mockEmitPayload.jobId);

            expect(emitter.allEmittedJobTargetEvents).not.toContain(mockEmitPayload);
        });
    });
});
