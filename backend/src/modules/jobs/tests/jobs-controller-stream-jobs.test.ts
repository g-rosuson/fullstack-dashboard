import { Mock } from 'vitest';

import { streamJobs } from '../jobs-controller';

import constants from 'shared/constants';

import type { Request, Response } from 'express';

/**
 * Mocks for the request and response objects.
 */
const mockResponseWrite = vi.fn();
const mockResponseFlushHeaders = vi.fn();
const mockResponseSetHeader = vi.fn();
const mockResponse = {
    write: mockResponseWrite,
    flushHeaders: mockResponseFlushHeaders,
    setHeader: mockResponseSetHeader,
} as unknown as Response;
const mockRequestOn = vi.fn();

const mockRequest = {
    context: {
        user: { id: 'user-id-1' },
        delegator: {
            runningJobs: new Map([
                ['job-id-1', { userId: 'user-id-1' }],
                ['job-id-2', { userId: 'user-id-2' }],
            ]),
        },
        emitter: {
            allEmittedJobTargetEvents: [
                { jobId: 'job-id-1', userId: 'user-id-1', type: constants.events.jobs.targetFinished },
            ],
            on: vi.fn(),
            off: vi.fn(),
        },
    },
    on: mockRequestOn,
} as unknown as Request;

describe('jobs-controller', () => {
    /**
     * Parses the mock write function to return the events.
     * @param mockWrite The mock write function to parse
     * @returns The parsed events
     */
    const parseSSE = (mockWrite: Mock) => {
        const raw = mockWrite.mock.calls.map(c => c[0]).join('');

        return raw
            .split('\n\n')
            .filter(Boolean)
            .map(chunk => {
                const [eventLine, dataLine] = chunk.split('\n');

                return {
                    event: eventLine.replace('event: ', ''),
                    data: JSON.parse(dataLine.replace('data: ', '')),
                };
            });
    };

    describe('streamJobs', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            streamJobs(mockRequest, mockResponse);
        });

        it('should handle header setup correctly', () => {
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
            expect(mockResponseFlushHeaders).toHaveBeenCalled();
        });

        it('should emit events in correct order for correct user', () => {
            const events = parseSSE(mockResponseWrite);

            expect(events).toEqual([
                {
                    event: constants.events.jobs.runningJobs,
                    data: {
                        runningJobs: ['job-id-1'],
                        type: constants.events.jobs.runningJobs,
                    },
                },
                {
                    event: constants.events.jobs.targetFinished,
                    data: {
                        jobId: 'job-id-1',
                        userId: 'user-id-1',
                        type: constants.events.jobs.targetFinished,
                    },
                },
            ]);
        });

        it('should attach listeners for events', () => {
            expect(mockRequest.context.emitter.on).toHaveBeenCalledWith(
                constants.events.jobs.runningJobs,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.on).toHaveBeenCalledWith(
                constants.events.jobs.targetFinished,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.on).toHaveBeenCalledWith(
                constants.events.jobs.jobFinished,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.on).toHaveBeenCalledWith(
                constants.events.jobs.jobFailed,
                expect.any(Function)
            );
        });

        it('should detach listeners when the connection is closed', () => {
            const closeHandler = (mockRequestOn as Mock).mock.calls[0][1];

            closeHandler?.();

            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.runningJobs,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.targetFinished,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.jobFinished,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.jobFailed,
                expect.any(Function)
            );
        });

        it('should stream a live targetFinished event to the client', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.targetFinished)?.[1];

            mockResponseWrite.mockClear();

            const liveEvent = { jobId: 'job-id-1', userId: 'user-id-1', type: constants.events.jobs.targetFinished };
            handler(liveEvent);

            expect(parseSSE(mockResponseWrite)).toEqual([
                {
                    event: constants.events.jobs.targetFinished,
                    data: liveEvent,
                },
            ]);
        });

        it('should not stream a live targetFinished event for another user', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.targetFinished)?.[1];

            mockResponseWrite.mockClear();

            handler({
                jobId: 'job-id-1',
                userId: 'user-id-99',
                type: constants.events.jobs.targetFinished,
            });

            expect(parseSSE(mockResponseWrite)).toEqual([]);
        });

        it('should stream a live jobFinished event to the client', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.jobFinished)?.[1];

            mockResponseWrite.mockClear();

            const liveEvent = {
                jobId: 'job-id-1',
                userId: 'user-id-1',
                type: constants.events.jobs.jobFinished,
                finishedAt: '2026-03-10T12:00:00.000Z',
                executionId: 'exec-1',
            };
            handler(liveEvent);

            expect(parseSSE(mockResponseWrite)).toEqual([
                {
                    event: constants.events.jobs.jobFinished,
                    data: liveEvent,
                },
            ]);
        });

        it('should not stream a live jobFinished event for another user', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.jobFinished)?.[1];

            mockResponseWrite.mockClear();

            handler({
                jobId: 'job-id-1',
                userId: 'user-id-99',
                type: constants.events.jobs.jobFinished,
                finishedAt: '2026-03-10T12:00:00.000Z',
                executionId: 'exec-1',
            });

            expect(parseSSE(mockResponseWrite)).toEqual([]);
        });

        it('should stream a live runningJobs event to the client', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.runningJobs)?.[1];

            mockResponseWrite.mockClear();

            const liveEvent = {
                runningJobs: ['job-id-1'],
                userId: 'user-id-1',
                type: constants.events.jobs.runningJobs,
            };
            handler(liveEvent);

            expect(parseSSE(mockResponseWrite)).toEqual([
                {
                    event: constants.events.jobs.runningJobs,
                    data: liveEvent,
                },
            ]);
        });

        it('should not stream a live runningJobs event for another user', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.runningJobs)?.[1];

            mockResponseWrite.mockClear();

            handler({
                runningJobs: ['job-other'],
                userId: 'user-id-99',
                type: constants.events.jobs.runningJobs,
            });

            expect(parseSSE(mockResponseWrite)).toEqual([]);
        });

        it('should stream a live jobFailed event to the client', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.jobFailed)?.[1];

            mockResponseWrite.mockClear();

            const liveEvent = {
                jobId: 'job-id-1',
                userId: 'user-id-1',
                executionId: 'exec-fail',
                failedAt: '2026-03-10T12:00:00.000Z',
                type: constants.events.jobs.jobFailed,
            };
            handler(liveEvent);

            expect(parseSSE(mockResponseWrite)).toEqual([
                {
                    event: constants.events.jobs.jobFailed,
                    data: liveEvent,
                },
            ]);
        });

        it('should not stream a live jobFailed event for another user', () => {
            const onCalls = (mockRequest.context.emitter.on as Mock).mock.calls;
            const handler = onCalls.find(([event]) => event === constants.events.jobs.jobFailed)?.[1];

            mockResponseWrite.mockClear();

            handler({
                jobId: 'job-id-1',
                userId: 'user-id-99',
                executionId: 'exec-fail',
                failedAt: '2026-03-10T12:00:00.000Z',
                type: constants.events.jobs.jobFailed,
            });

            expect(parseSSE(mockResponseWrite)).toEqual([]);
        });

        describe('when a buffered target event belongs to a job that is no longer running', () => {
            const replayRequestOn = vi.fn();
            const replayRequest = {
                context: {
                    user: { id: 'user-id-1' },
                    delegator: {
                        runningJobs: new Map<string, { userId: string }>(),
                    },
                    emitter: {
                        allEmittedJobTargetEvents: [
                            {
                                jobId: 'job-id-stale',
                                userId: 'user-id-1',
                                type: constants.events.jobs.targetFinished,
                            },
                        ],
                        on: vi.fn(),
                        off: vi.fn(),
                    },
                },
                on: replayRequestOn,
            } as unknown as Request;

            beforeEach(() => {
                vi.clearAllMocks();
                streamJobs(replayRequest, mockResponse);
            });

            it('should not replay that target-finished event', () => {
                const events = parseSSE(mockResponseWrite);

                expect(events).toEqual([
                    {
                        event: constants.events.jobs.runningJobs,
                        data: {
                            runningJobs: [],
                            type: constants.events.jobs.runningJobs,
                        },
                    },
                ]);
            });
        });
    });
});
