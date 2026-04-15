const mockLoggerError = vi.hoisted(() => vi.fn());

import { createJob } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { CreateJobInput } from '../types';
import type { Request, Response } from 'express';

/**
 * Mocks for the create job function.
 */
const mockCreate = vi.fn();
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
 * Builds a request body for the create job function.
 * @returns The request body
 */
const buildRequestBody = (): CreateJobInput => ({
    name: 'Daily engineering jobs',
    schedule: {
        type: 'daily' as const,
        startDate: scheduledStartDate,
        endDate: null,
    },
    tools: [
        {
            type: 'scraper' as const,
            keywords: ['typescript', 'backend'],
            maxPages: 5,
            targets: [
                {
                    target: 'jobs-ch' as const,
                    keywords: ['remote'],
                    maxPages: 2,
                },
                {
                    target: 'jobs-ch' as const,
                },
            ],
        },
    ],
});

/**
 * Builds a request for the create job function.
 * @param body The request body
 * @returns The request
 */
const buildRequest = (body: CreateJobInput = buildRequestBody()) =>
    ({
        body,
        context: {
            user: { id: 'user-id-1' },
            db: {
                transaction: {
                    startSession: mockStartSession,
                },
                repository: {
                    jobs: {
                        create: mockCreate,
                    },
                },
            },
            scheduler: {
                schedule: mockSchedule,
            },
            delegator: {
                register: mockRegister,
                delegate: mockDelegate,
            },
        },
    }) as unknown as Request;

/**
 * Payload passed to `repository.jobs.create` after `mapToIds` (stable UUIDs from mocked `randomUUID`).
 */
const expectedCreateCallPayload = (requestBody: CreateJobInput) => ({
    userId: 'user-id-1',
    name: requestBody.name,
    schedule: requestBody.schedule,
    tools: [
        {
            ...requestBody.tools[0],
            toolId: mockToolIdOne,
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
    createdAt: now,
    updatedAt: null,
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

    describe('createJob', () => {
        it('should create, schedule, and register a scheduled job', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const scheduledJobSchedule = requestBody.schedule as NonNullable<CreateJobInput['schedule']>;
            const createdJob = {
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
                createdAt: now,
                updatedAt: null,
            };

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);

            mockCreate.mockResolvedValue(createdJob);

            await createJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockCreate).toHaveBeenCalledWith(expectedCreateCallPayload(requestBody), mockSession);
            expect(mockSchedule).toHaveBeenCalledWith({
                jobId: createdJob.id,
                name: createdJob.name,
                type: scheduledJobSchedule.type,
                startDate: scheduledJobSchedule.startDate,
                endDate: scheduledJobSchedule.endDate,
            });
            expect(mockRegister).toHaveBeenCalledWith({
                jobId: createdJob.id,
                userId: 'user-id-1',
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: scheduledJobSchedule.type,
            });
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: createdJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should delegate immediately when the created job has no schedule', async () => {
            const requestBody = {
                ...buildRequestBody(),
                schedule: null,
            };
            const mockRequest = buildRequest(requestBody);
            const createdJob = {
                id: 'job-id-2',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: null,
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
                createdAt: now,
                updatedAt: null,
            };

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockCreate.mockResolvedValue(createdJob);

            await createJob(mockRequest, mockResponse);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockCreate).toHaveBeenCalledWith(expectedCreateCallPayload(requestBody), mockSession);
            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).toHaveBeenCalledWith({
                jobId: createdJob.id,
                userId: 'user-id-1',
                name: createdJob.name,
                tools: createdJob.tools,
                scheduleType: null,
            });
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: createdJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should abort the transaction and rethrow when the repository create fails', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const dbError = new Error('database create failed');

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockCreate.mockRejectedValue(dbError);

            await expect(createJob(mockRequest, mockResponse)).rejects.toThrow(dbError);

            expect(mockStartSession).toHaveBeenCalled();
            expect(mockStartTransaction).toHaveBeenCalled();
            expect(mockCommitTransaction).not.toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: dbError });
            expect(mockResponseStatus).not.toHaveBeenCalled();
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should rethrow when scheduling fails after the transaction commits', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const createdJob = {
                id: 'job-id-3',
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
                createdAt: now,
                updatedAt: null,
            };
            const scheduleError = new Error('scheduler failed');

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockCreate.mockResolvedValue(createdJob);
            mockSchedule.mockImplementation(() => {
                throw scheduleError;
            });

            await expect(createJob(mockRequest, mockResponse)).rejects.toThrow(scheduleError);

            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: scheduleError });
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: createdJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });

        it('should rethrow when register fails after schedule succeeds and the transaction has committed', async () => {
            const requestBody = buildRequestBody();
            const mockRequest = buildRequest(requestBody);
            const createdJob = {
                id: 'job-id-4',
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
                createdAt: now,
                updatedAt: null,
            };
            const registerError = new Error('delegator register failed');

            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(mockToolIdOne)
                .mockReturnValueOnce(mockTargetIdOne)
                .mockReturnValueOnce(mockTargetIdTwo);
            mockCreate.mockResolvedValue(createdJob);
            mockRegister.mockImplementation(() => {
                throw registerError;
            });

            await expect(createJob(mockRequest, mockResponse)).rejects.toThrow(registerError);

            expect(mockSchedule).toHaveBeenCalled();
            expect(mockRegister).toHaveBeenCalled();
            expect(mockCommitTransaction).toHaveBeenCalled();
            expect(mockAbortTransaction).toHaveBeenCalled();
            expect(mockDelegate).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: registerError });
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: createdJob,
            });
            expect(mockEndSession).toHaveBeenCalled();
        });
    });
});
