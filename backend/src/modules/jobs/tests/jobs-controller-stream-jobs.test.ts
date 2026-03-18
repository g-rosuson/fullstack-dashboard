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
        console.log(raw);
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

    beforeEach(() => {
        vi.clearAllMocks();
        streamJobs(mockRequest, mockResponse);
    });

    describe('streamJobs', () => {
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
                constants.events.jobs.targetFinished,
                expect.any(Function)
            );
            expect(mockRequest.context.emitter.on).toHaveBeenCalledWith(
                constants.events.jobs.jobFinished,
                expect.any(Function)
            );
        });

        it('should detach listeners when the connection is closed', () => {
            const closeHandler = (mockRequestOn as Mock).mock.calls[0][1];

            closeHandler?.();

            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.targetFinished,
                expect.any(Function)
            );

            expect(mockRequest.context.emitter.off).toHaveBeenCalledWith(
                constants.events.jobs.jobFinished,
                expect.any(Function)
            );
        });
    });
});
