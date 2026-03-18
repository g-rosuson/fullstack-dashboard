import constants from 'shared/constants';

import type { EventType } from './types';

import { Emitter } from './';

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
            const mockJobTargetFinishedEvent = {
                jobId: 'test-job-id',
                targetId: 'test-target-id',
                target: 'jobs-ch' as const,
                results: [],
                userId: 'test-user-id',
                type: constants.events.jobs.targetFinished,
            };

            emitter.emit(mockJobTargetFinishedEvent);

            // toContainEqual: Compare object shape and not reference equality
            expect(emitter.allEmittedJobTargetEvents).toContainEqual(mockJobTargetFinishedEvent);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.targetFinished, mockJobTargetFinishedEvent);
        });

        it('handles job-finished events correctly', () => {
            const mockEmitPayload = {
                jobId: 'test-job-id',
                type: constants.events.jobs.jobFinished,
            };

            emitter.emit(mockEmitPayload);

            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockEmitPayload);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobFinished, mockEmitPayload);
        });

        it('handles running-jobs events correctly', () => {
            const mockEmitPayload = {
                runningJobs: ['test-job-id'],
                type: constants.events.jobs.runningJobs,
            };

            emitter.emit(mockEmitPayload);
            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockEmitPayload);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.runningJobs, mockEmitPayload);
        });
    });

    describe('on', () => {
        it('adds a listener correctly', () => {
            const mockEvent = 'test-event' as EventType;
            emitter.on(mockEvent, callback);

            expect(mockOn).toHaveBeenCalledWith(mockEvent, callback);
        });
    });

    describe('off', () => {
        it('removes a listener correctly', () => {
            const mockEvent = 'test-event' as EventType;
            emitter.off(mockEvent, callback);

            expect(mockOff).toHaveBeenCalledWith(mockEvent, callback);
        });
    });

    describe('clearJobTargetEvents', () => {
        it('clears job-target-finished events correctly', () => {
            const mockJobTargetFinishedEvent = {
                jobId: 'test-job-id',
                targetId: 'test-target-id',
                target: 'jobs-ch' as const,
                results: [],
                userId: 'test-user-id',
                type: constants.events.jobs.targetFinished,
            };

            const mockJobTargetFinishedEventTwo = {
                jobId: 'test-job-id',
                targetId: 'test-target-id-two',
                target: 'jobs-ch' as const,
                results: [],
                userId: 'test-user-id-two',
                type: constants.events.jobs.targetFinished,
            };

            const mockJobTargetFinishedEventThree = {
                jobId: 'test-job-id-three',
                targetId: 'test-target-id-three',
                target: 'jobs-ch' as const,
                results: [],
                userId: 'test-user-id-three',
                type: constants.events.jobs.targetFinished,
            };

            emitter.emit(mockJobTargetFinishedEvent);
            emitter.emit(mockJobTargetFinishedEventTwo);
            emitter.emit(mockJobTargetFinishedEventThree);

            emitter.clearJobTargetEvents('test-job-id');

            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockJobTargetFinishedEvent);
            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockJobTargetFinishedEventTwo);
            expect(emitter.allEmittedJobTargetEvents).toContainEqual(mockJobTargetFinishedEventThree);
        });
    });
});
