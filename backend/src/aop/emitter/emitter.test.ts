import constants from 'shared/constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import { Emitter } from './';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const callback = vi.fn();

const mockLoggerError = vi.hoisted(() => vi.fn());

vi.mock('aop/logging', () => ({
    logger: {
        error: mockLoggerError,
        info: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('events', () => ({
    EventEmitter: vi.fn(() => ({
        emit: mockEmit,
        on: mockOn,
        off: mockOff,
    })),
}));

/**
 * Minimal payload that satisfies `jobTargetFinishedEventSchema` (matches delegator / OpenAPI shape).
 */
function jobTargetFinishedFixture(
    jobId: string,
    userId: string,
    executionId: string,
    toolId: string,
    targetId: string
) {
    return {
        jobId,
        userId,
        executionId,
        type: constants.events.jobs.targetFinished,
        schedule: {
            type: null,
            delegatedAt: '2026-01-01T12:00:00.000Z',
            finishedAt: null,
        },
        tool: {
            toolId,
            type: 'scraper' as const,
            targets: [{ target: 'jobs-ch' as const, targetId }],
        },
        target: {
            target: 'jobs-ch' as const,
            targetId,
            results: [
                {
                    result: {
                        url: 'https://example.com/job',
                        title: 'Title',
                        descriptions: [{ blocks: [] as string[] }],
                        informations: [] as { label: string; value: string }[],
                    },
                    error: null,
                },
            ],
        },
    };
}

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
            const mockJobTargetFinishedEvent = jobTargetFinishedFixture(
                'test-job-id',
                'test-user-id',
                'exec-1',
                'test-tool-id',
                'test-target-id'
            );

            emitter.emit(mockJobTargetFinishedEvent);

            expect(emitter.allEmittedJobTargetEvents).toContainEqual(mockJobTargetFinishedEvent);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.targetFinished, mockJobTargetFinishedEvent);
        });

        it('handles job-finished events correctly', () => {
            const mockEmitPayload = {
                jobId: 'test-job-id',
                userId: 'test-user-id',
                type: constants.events.jobs.jobFinished,
                finishedAt: '2026-01-01T12:00:00.000Z',
                executionId: 'exec-finished',
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

        it('handles job-failed events correctly', () => {
            const mockEmitPayload = {
                jobId: 'test-job-id',
                userId: 'test-user-id',
                executionId: 'exec-failed',
                type: constants.events.jobs.jobFailed,
                failedAt: '2026-01-01T12:00:00.000Z',
            };

            emitter.emit(mockEmitPayload);

            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockEmitPayload);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobFailed, mockEmitPayload);
        });

        it('does not forward invalid events and logs validation failure', () => {
            const invalidPayload = {
                type: constants.events.jobs.jobFinished,
                jobId: 'test-job-id',
            };

            emitter.emit(invalidPayload as never);

            expect(mockLoggerError).toHaveBeenCalledWith(
                ErrorMessage.SCHEMA_VALIDATION_FAILED,
                expect.objectContaining({ issues: expect.any(Array) })
            );
            expect(mockEmit).not.toHaveBeenCalled();
            expect(emitter.allEmittedJobTargetEvents).toEqual([]);
        });
    });

    describe('on', () => {
        it('adds a listener correctly', () => {
            emitter.on(constants.events.jobs.runningJobs, callback);

            expect(mockOn).toHaveBeenCalledWith(constants.events.jobs.runningJobs, callback);
        });
    });

    describe('off', () => {
        it('removes a listener correctly', () => {
            emitter.off(constants.events.jobs.runningJobs, callback);

            expect(mockOff).toHaveBeenCalledWith(constants.events.jobs.runningJobs, callback);
        });
    });

    describe('clearJobTargetEvents', () => {
        it('clears job-target-finished events correctly', () => {
            const mockJobTargetFinishedEvent = jobTargetFinishedFixture(
                'test-job-id',
                'test-user-id',
                'exec-a',
                'test-tool-id',
                'test-target-id'
            );

            const mockJobTargetFinishedEventTwo = jobTargetFinishedFixture(
                'test-job-id',
                'test-user-id-two',
                'exec-b',
                'test-tool-id-two',
                'test-target-id-two'
            );

            const mockJobTargetFinishedEventThree = jobTargetFinishedFixture(
                'test-job-id-three',
                'test-user-id-three',
                'exec-c',
                'test-tool-id-three',
                'test-target-id-three'
            );

            emitter.emit(mockJobTargetFinishedEvent);
            emitter.emit(mockJobTargetFinishedEventTwo);
            emitter.emit(mockJobTargetFinishedEventThree);

            emitter.clearJobTargetEvents('test-job-id');

            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockJobTargetFinishedEvent);
            expect(emitter.allEmittedJobTargetEvents).not.toContainEqual(mockJobTargetFinishedEventTwo);
            expect(emitter.allEmittedJobTargetEvents).toContainEqual(mockJobTargetFinishedEventThree);
        });

        it('does nothing harmful when the buffer is empty', () => {
            expect(emitter.allEmittedJobTargetEvents).toEqual([]);

            emitter.clearJobTargetEvents('any-job-id');

            expect(emitter.allEmittedJobTargetEvents).toEqual([]);
        });

        it('does not remove events when the job id does not match', () => {
            const event = jobTargetFinishedFixture('job-a', 'user-a', 'exec-1', 'tool-1', 'target-1');

            emitter.emit(event);

            emitter.clearJobTargetEvents('job-b');

            expect(emitter.allEmittedJobTargetEvents).toHaveLength(1);
            expect(emitter.allEmittedJobTargetEvents).toContainEqual(event);
        });

        it('is idempotent when clearing the same job twice', () => {
            const event = jobTargetFinishedFixture('job-a', 'user-a', 'exec-1', 'tool-1', 'target-1');

            emitter.emit(event);
            emitter.clearJobTargetEvents('job-a');
            expect(emitter.allEmittedJobTargetEvents).toEqual([]);

            emitter.clearJobTargetEvents('job-a');

            expect(emitter.allEmittedJobTargetEvents).toEqual([]);
        });
    });
});
