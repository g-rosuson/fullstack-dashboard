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

import type { JobTargetFinishedEvent } from './types';

/**
 * Minimal payload that satisfies `jobTargetFinishedEventSchema` (matches delegator / OpenAPI shape).
 */
function jobTargetFinishedFixture(
    jobId: string,
    userId: string,
    executionId: string,
    toolId: string,
    targetId: string
): JobTargetFinishedEvent {
    return {
        jobId,
        userId,
        executionId,
        type: constants.events.jobs.jobTargetFinished,
        schedule: {
            type: null,
            delegatedAt: '2026-01-01T12:00:00.000Z',
            finishedAt: null,
            cancelledAt: null,
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
                    listing: {
                        ok: true,
                        source: 'jobs-ch',
                        url: 'https://example.com/job',
                        title: 'Title',
                        text: 'Fixture body',
                    },
                },
            ],
            summary: {
                total: 1,
                passed: 1,
                rejected: 0,
                reasonCounts: {},
            },
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

            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toContainEqual(mockJobTargetFinishedEvent);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobTargetFinished, mockJobTargetFinishedEvent);
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

            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobFinished, mockEmitPayload);
        });

        it('handles running-jobs events correctly', () => {
            const mockEmitPayload = {
                runningJobs: ['test-job-id'],
                type: constants.events.jobs.jobsRunning,
            };

            emitter.emit(mockEmitPayload);
            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobsRunning, mockEmitPayload);
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

            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobFailed, mockEmitPayload);
        });

        it('handles job-cancelled events correctly', () => {
            const mockEmitPayload = {
                jobId: 'test-job-id',
                userId: 'test-user-id',
                executionId: 'exec-cancelled',
                type: constants.events.jobs.jobCancelled,
                cancelledAt: '2026-01-01T12:00:00.000Z',
            };

            emitter.emit(mockEmitPayload);

            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
            expect(mockEmit).toHaveBeenCalledWith(constants.events.jobs.jobCancelled, mockEmitPayload);
        });

        it('forwards an mcp selecting event', () => {
            const selecting = {
                type: constants.events.mcp.selecting,
                promptId: 'prompt-1',
                userId: 'user-1',
            };

            emitter.emit(selecting);

            expect(mockEmit).toHaveBeenCalledWith(constants.events.mcp.selecting, selecting);
        });

        it('does not forward an mcp event without userId', () => {
            emitter.emit({
                type: constants.events.mcp.selecting,
                promptId: 'prompt-1',
            } as never);

            expect(mockLoggerError).toHaveBeenCalledWith(
                ErrorMessage.SCHEMA_VALIDATION_FAILED,
                expect.objectContaining({ issues: expect.any(Array) })
            );
            expect(mockEmit).not.toHaveBeenCalled();
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
            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
        });
    });

    describe('on', () => {
        it('adds a listener correctly', () => {
            emitter.on(constants.events.jobs.jobsRunning, callback);

            expect(mockOn).toHaveBeenCalledWith(constants.events.jobs.jobsRunning, callback);
        });
    });

    describe('off', () => {
        it('removes a listener correctly', () => {
            emitter.off(constants.events.jobs.jobsRunning, callback);

            expect(mockOff).toHaveBeenCalledWith(constants.events.jobs.jobsRunning, callback);
        });
    });

    describe('getEmittedJobTargetEventsForUser', () => {
        it('returns only buffered target-finished events for the given user', () => {
            const ownerEvent = jobTargetFinishedFixture('job-a', 'user-a', 'exec-a', 'tool-a', 'target-a');
            const otherEvent = jobTargetFinishedFixture('job-b', 'user-b', 'exec-b', 'tool-b', 'target-b');
            const ownerEventTwo = jobTargetFinishedFixture('job-c', 'user-a', 'exec-c', 'tool-c', 'target-c');

            emitter.emit(ownerEvent);
            emitter.emit(otherEvent);
            emitter.emit(ownerEventTwo);

            expect(emitter.getEmittedJobTargetEventsForUser('user-a')).toEqual([ownerEvent, ownerEventTwo]);
            expect(emitter.getEmittedJobTargetEventsForUser('user-b')).toEqual([otherEvent]);
            expect(emitter.getEmittedJobTargetEventsForUser('nobody')).toEqual([]);
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

            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id')).toEqual([]);
            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id-two')).toEqual([]);
            expect(emitter.getEmittedJobTargetEventsForUser('test-user-id-three')).toEqual([
                mockJobTargetFinishedEventThree,
            ]);
        });

        it('does nothing harmful when the buffer is empty', () => {
            expect(emitter.getEmittedJobTargetEventsForUser('any-user-id')).toEqual([]);

            emitter.clearJobTargetEvents('any-job-id');

            expect(emitter.getEmittedJobTargetEventsForUser('any-user-id')).toEqual([]);
        });

        it('does not remove events when the job id does not match', () => {
            const event = jobTargetFinishedFixture('job-a', 'user-a', 'exec-1', 'tool-1', 'target-1');

            emitter.emit(event);

            emitter.clearJobTargetEvents('job-b');

            expect(emitter.getEmittedJobTargetEventsForUser('user-a')).toEqual([event]);
        });

        it('is idempotent when clearing the same job twice', () => {
            const event = jobTargetFinishedFixture('job-a', 'user-a', 'exec-1', 'tool-1', 'target-1');

            emitter.emit(event);
            emitter.clearJobTargetEvents('job-a');
            expect(emitter.getEmittedJobTargetEventsForUser('user-a')).toEqual([]);

            emitter.clearJobTargetEvents('job-a');

            expect(emitter.getEmittedJobTargetEventsForUser('user-a')).toEqual([]);
        });
    });
});
