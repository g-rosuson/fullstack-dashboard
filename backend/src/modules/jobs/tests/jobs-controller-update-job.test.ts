import { BusinessLogicException } from 'aop/exceptions';

import { updateJob } from '../jobs-controller';

import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam, UpdateJobPayload } from '../types';
import type { Request, Response } from 'express';

/**
 * Mocks for the update job function.
 */
const mockLoggerError = vi.hoisted(() => vi.fn());
const mockUpdate = vi.fn();
const mockSchedule = vi.fn();
const mockRegister = vi.fn();
const mockDelegate = vi.fn();
const mockStartTransaction = vi.fn();
const mockCommitTransaction = vi.fn();
const mockAbortTransaction = vi.fn();
const mockEndSession = vi.fn();
const mockResponseStatus = vi.fn();
const mockResponseJson = vi.fn();

const mockSession = {
    startTransaction: mockStartTransaction,
    commitTransaction: mockCommitTransaction,
    abortTransaction: mockAbortTransaction,
    endSession: mockEndSession,
};
const mockStartSession = vi.fn(() => mockSession);

const mockResponse = {
    status: mockResponseStatus,
    json: mockResponseJson,
} as unknown as Response;

const now = new Date('2026-03-10T12:00:00.000Z');
const scheduledStartDate = new Date('2026-03-11T08:30:00.000Z');
const mockTargetIdOne = '11111111-1111-1111-1111-111111111111';
const mockTargetIdTwo = '22222222-2222-2222-2222-222222222222';

/**
 * Mocks for the logging module.
 */
vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: mockLoggerError,
    },
}));

/**
 * Builds a request body for the update job function.
 * @returns The request body
 */
const buildRequestBody = (): UpdateJobPayload => ({
    name: 'Updated engineering jobs',
    schedule: {
        type: 'weekly' as const,
        startDate: scheduledStartDate,
        endDate: null,
    },
    tools: [
        {
            type: 'scraper' as const,
            keywords: ['typescript', 'node'],
            maxPages: 3,
            targets: [
                {
                    target: 'jobs-ch' as const,
                    keywords: ['hybrid'],
                    maxPages: 2,
                },
                {
                    target: 'jobs-ch' as const,
                },
            ],
        },
    ],
    runJob: true,
});

/**
 * Builds a request for the update job function.
 * @param body The request body
 * @param runningJobIds Running job IDs to seed the delegator state
 * @returns The request
 */
const buildRequest = (body: UpdateJobPayload = buildRequestBody(), runningJobIds: string[] = []) =>
    ({
        params: {
            id: 'job-id-1',
        },
        body,
        context: {
            user: { id: 'user-id-1' },
            db: {
                transaction: {
                    startSession: mockStartSession,
                },
                repository: {
                    jobs: {
                        update: mockUpdate,
                    },
                },
            },
            scheduler: {
                schedule: mockSchedule,
            },
            delegator: {
                runningJobs: new Map(runningJobIds.map(jobId => [jobId, { userId: 'user-id-1' }])),
                register: mockRegister,
                delegate: mockDelegate,
            },
        },
    }) as unknown as Request<IdRouteParam, unknown, UpdateJobPayload>;

describe('jobs-controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(now);
        mockResponseStatus.mockReturnValue(mockResponse);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('updateJob', () => {
        it('should update, schedule, and register a scheduled job when runJob is true', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const scheduledJobSchedule = requestBody.schedule as NonNullable<UpdateJobPayload['schedule']>;
            const updatedJob = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: scheduledJobSchedule,
                tools: [
                    {
                        ...requestBody.tools[0],
                        targets: [
                            {
                                ...requestBody.tools[0].targets[0],
                                targetId: mockTargetIdOne,
                            },
                            {
                                ...requestBody.tools[0].targets[1],
                                targetId: mockTargetIdTwo,
                            },
                        ],
                    },
                ],
                createdAt: new Date('2026-03-01T12:00:00.000Z'),
                updatedAt: now,
            };

            vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(mockTargetIdOne).mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalledWith(
                {
                    id: 'job-id-1',
                    userId: 'user-id-1',
                    name: requestBody.name,
                    schedule: requestBody.schedule,
                    tools: [
                        {
                            ...requestBody.tools[0],
                            targets: [
                                {
                                    ...requestBody.tools[0].targets[0],
                                    targetId: mockTargetIdOne,
                                },
                                {
                                    ...requestBody.tools[0].targets[1],
                                    targetId: mockTargetIdTwo,
                                },
                            ],
                        },
                    ],
                    updatedAt: now,
                },
                mockSession
            );
            expect(mockSchedule).toHaveBeenCalledWith({
                name: requestBody.name,
                type: scheduledJobSchedule.type,
                startDate: scheduledJobSchedule.startDate,
                endDate: scheduledJobSchedule.endDate,
                jobId: 'job-id-1',
            });
            expect(mockRegister).toHaveBeenCalledWith({
                jobId: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                tools: [
                    {
                        ...requestBody.tools[0],
                        targets: [
                            {
                                ...requestBody.tools[0].targets[0],
                                targetId: mockTargetIdOne,
                            },
                            {
                                ...requestBody.tools[0].targets[1],
                                targetId: mockTargetIdTwo,
                            },
                        ],
                    },
                ],
                scheduleType: scheduledJobSchedule.type,
            });
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: updatedJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should delegate immediately when runJob is true and the schedule is null', async () => {
            const requestBody: UpdateJobPayload = {
                ...buildRequestBody(),
                schedule: null,
                runJob: true,
            };
            const mockRequest = buildRequest(requestBody);
            const updatedTools = [
                {
                    ...requestBody.tools[0],
                    targets: [
                        {
                            ...requestBody.tools[0].targets[0],
                            targetId: mockTargetIdOne,
                        },
                        {
                            ...requestBody.tools[0].targets[1],
                            targetId: mockTargetIdTwo,
                        },
                    ],
                },
            ];
            const updatedJob = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: null,
                tools: updatedTools,
                createdAt: new Date('2026-03-01T12:00:00.000Z'),
                updatedAt: now,
            };

            vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(mockTargetIdOne).mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).toHaveBeenCalledWith({
                jobId: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                tools: updatedTools,
                scheduleType: null,
            });
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should not schedule or delegate when runJob is false', async () => {
            const requestBody: UpdateJobPayload = {
                ...buildRequestBody(),
                runJob: false,
            };
            const mockRequest = buildRequest(requestBody);
            const updatedJob = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: requestBody.schedule,
                tools: [],
                createdAt: new Date('2026-03-01T12:00:00.000Z'),
                updatedAt: now,
            };

            vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(mockTargetIdOne).mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should abort the transaction and rethrow when the job is already running', async () => {
            const mockRequest = buildRequest(buildRequestBody(), ['job-id-1']);
            const updateJobPromise = updateJob(mockRequest, mockResponse);

            await expect(updateJobPromise).rejects.toThrow(BusinessLogicException);
            await expect(updateJobPromise).rejects.toThrow(ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING);

            expect(mockUpdate).not.toHaveBeenCalled();
            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockCommitTransaction).not.toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', {
                error: expect.any(BusinessLogicException),
            });
            expect(mockResponseStatus).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should abort the transaction and rethrow when scheduling fails', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const updatedJob = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: requestBody.schedule,
                tools: [],
                createdAt: new Date('2026-03-01T12:00:00.000Z'),
                updatedAt: now,
            };
            const scheduleError = new Error('scheduler failed');

            vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(mockTargetIdOne).mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);
            mockSchedule.mockImplementation(() => {
                throw scheduleError;
            });

            await expect(updateJob(mockRequest, mockResponse)).rejects.toThrow(scheduleError);

            expect(mockCommitTransaction).not.toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: scheduleError });
            expect(mockResponseStatus).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });
    });
});
