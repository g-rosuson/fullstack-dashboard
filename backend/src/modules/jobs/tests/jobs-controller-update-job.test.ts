import { BusinessLogicException } from 'aop/exceptions';

import { updateJob } from '../jobs-controller';

import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam, UpdateJobInput } from '../types';
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

const now = new Date('2026-03-10T12:00:00.000Z').toISOString();
const scheduledStartDate = new Date('2026-03-11T08:30:00.000Z').toISOString();
const mockTargetIdOne = '11111111-1111-1111-1111-111111111111';
const mockTargetIdTwo = '22222222-2222-2222-2222-222222222222';
const mockToolIdOne = '33333333-3333-3333-3333-333333333333';

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
const buildRequestBody = (): UpdateJobInput => ({
    name: 'Updated engineering jobs',
    schedule: {
        type: 'weekly' as const,
        startDate: scheduledStartDate,
        endDate: null,
    },
    tools: [
        {
            toolId: mockToolIdOne,
            type: 'scraper' as const,
            keywords: ['typescript', 'node'],
            maxPages: 3,
            targets: [
                {
                    targetId: mockTargetIdOne,
                    target: 'jobs-ch' as const,
                    keywords: ['hybrid'],
                    maxPages: 2,
                },
                {
                    targetId: mockTargetIdTwo,
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
const buildRequest = (body: UpdateJobInput = buildRequestBody(), runningJobIds: string[] = []) =>
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
    }) as unknown as Request<IdRouteParam, unknown, UpdateJobInput>;

/**
 * Payload passed to `repository.jobs.update` after `mapToIds` (stable UUIDs from mocked `randomUUID`).
 */
const expectedUpdateCallPayload = (requestBody: UpdateJobInput) => ({
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
});

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
        it('should update, schedule, and register when the job has a schedule', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const scheduledJobSchedule = requestBody.schedule as NonNullable<UpdateJobInput['schedule']>;
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

            const spy = vi.spyOn(crypto, 'randomUUID');
            spy.mockReturnValueOnce(mockToolIdOne);
            spy.mockReturnValueOnce(mockTargetIdOne);
            spy.mockReturnValueOnce(mockTargetIdTwo);

            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalledWith(expectedUpdateCallPayload(requestBody), mockSession);
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

        it('should still schedule and register when runJob is false but the job has a schedule', async () => {
            const requestBody: UpdateJobInput = {
                ...buildRequestBody(),
                runJob: false,
            };
            const mockRequest = buildRequest(requestBody);
            const scheduledJobSchedule = requestBody.schedule as NonNullable<UpdateJobInput['schedule']>;
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

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalledWith(expectedUpdateCallPayload(requestBody), mockSession);
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
            const requestBody: UpdateJobInput = {
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

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalledWith(expectedUpdateCallPayload(requestBody), mockSession);
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
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: updatedJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should not schedule or delegate when runJob is false and the job has no schedule', async () => {
            const requestBody: UpdateJobInput = {
                ...buildRequestBody(),
                schedule: null,
                runJob: false,
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

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);

            await updateJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockUpdate).toHaveBeenCalledWith(expectedUpdateCallPayload(requestBody), mockSession);
            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
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

        it('should abort the transaction and rethrow when the repository update fails', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const dbError = new Error('database update failed');

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockRejectedValue(dbError);

            await expect(updateJob(mockRequest, mockResponse)).rejects.toThrow(dbError);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockCommitTransaction).not.toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: dbError });
            expect(mockResponseStatus).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should abort the transaction and rethrow when the job is already running', async () => {
            const mockRequest = buildRequest(buildRequestBody(), ['job-id-1']);

            try {
                await updateJob(mockRequest, mockResponse);
                expect.fail('expected updateJob to throw');
            } catch (error) {
                expect(error).toBeInstanceOf(BusinessLogicException);
                expect((error as BusinessLogicException).message).toBe(
                    ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING
                );
            }

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

        it('should rethrow when scheduling fails after the transaction commits', async () => {
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

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);
            mockSchedule.mockImplementation(() => {
                throw scheduleError;
            });

            await expect(updateJob(mockRequest, mockResponse)).rejects.toThrow(scheduleError);

            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: scheduleError });
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: updatedJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should rethrow when register fails after schedule succeeds and the transaction has committed', async () => {
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
            const registerError = new Error('delegator register failed');

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockUpdate.mockResolvedValue(updatedJob);
            mockRegister.mockImplementation(() => {
                throw registerError;
            });

            await expect(updateJob(mockRequest, mockResponse)).rejects.toThrow(registerError);

            expect(mockSchedule).toHaveBeenCalled();
            expect(mockRegister).toHaveBeenCalled();
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: registerError });
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: updatedJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });
    });
});
