const mockLoggerError = vi.hoisted(() => vi.fn());

import { createJob } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { CreateJobInput } from '../types';
import type { Request, Response } from 'express';

const mockCreate = vi.fn();
const mockSchedule = vi.fn();
const mockGetNextAndPreviousRun = vi.fn();
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
const enrichedNextRun = new Date('2026-03-12T08:30:00.000Z');

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
            ],
        },
    ],
});

/**
 * Builds a request for the create job function.
 * @param body The request body
 * @returns The request
 */
const buildRequest = (body: CreateJobInput): Request =>
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
                getNextAndPreviousRun: mockGetNextAndPreviousRun,
            },
            delegator: {
                register: mockRegister,
                delegate: mockDelegate,
            },
        },
    }) as unknown as Request;

vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: mockLoggerError,
    },
}));

const buildCreatedJob = (body: CreateJobInput, scheduleOverride?: CreateJobInput['schedule']) => ({
    id: 'job-id-1',
    userId: 'user-id-1',
    name: body.name,
    schedule: typeof scheduleOverride === 'undefined' ? body.schedule : scheduleOverride,
    tools: [{ toolId: 'tool-1', ...body.tools[0], targets: [{ targetId: 'target-1', ...body.tools[0].targets[0] }] }],
    createdAt: now,
    updatedAt: null,
});

/** Expected shape of tools after real `mapToIds` (IDs are opaque strings). */
const expectMappedCreateTools = () =>
    expect.arrayContaining([
        expect.objectContaining({
            type: 'scraper',
            toolId: expect.any(String),
            keywords: ['typescript', 'backend'],
            maxPages: 5,
            targets: expect.arrayContaining([
                expect.objectContaining({
                    target: 'jobs-ch',
                    keywords: ['remote'],
                    maxPages: 2,
                    targetId: expect.any(String),
                }),
            ]),
        }),
    ]);

describe('jobs-controller createJob', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(now);
        mockResponseStatus.mockReturnValue(mockResponse);
        mockGetNextAndPreviousRun.mockReturnValue({
            nextRun: enrichedNextRun,
            previousRun: null,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('creates a scheduled job, responds with enriched schedule, and registers it', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const createdJob = buildCreatedJob(requestBody);

        mockCreate.mockResolvedValue(createdJob);

        await createJob(request, mockResponse);

        expect(mockStartSession).toHaveBeenCalledOnce();
        expect(mockStartTransaction).toHaveBeenCalledOnce();
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: requestBody.schedule,
                tools: expectMappedCreateTools(),
                createdAt: now,
                updatedAt: null,
            }),
            mockSession
        );
        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).toHaveBeenCalledWith({
            jobId: createdJob.id,
            name: createdJob.name,
            type: createdJob.schedule?.type,
            startDate: createdJob.schedule?.startDate,
            endDate: createdJob.schedule?.endDate,
        });
        expect(mockGetNextAndPreviousRun).toHaveBeenCalledWith(createdJob.id);
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
        expect(mockResponseJson).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    id: createdJob.id,
                    userId: createdJob.userId,
                    name: createdJob.name,
                    schedule: expect.objectContaining({
                        type: 'daily',
                        startDate: scheduledStartDate,
                        endDate: null,
                        nextRun: enrichedNextRun.toISOString(),
                        lastRun: null,
                    }),
                }),
            })
        );
        expect(mockRegister).toHaveBeenCalledWith({
            jobId: createdJob.id,
            userId: 'user-id-1',
            name: createdJob.name,
            tools: createdJob.tools,
            scheduleType: createdJob.schedule?.type,
        });
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('creates an unscheduled job and delegates it immediately', async () => {
        const requestBody: CreateJobInput = { ...buildRequestBody(), schedule: null };
        const request = buildRequest(requestBody);
        const createdJob = buildCreatedJob(requestBody, null);

        mockCreate.mockResolvedValue(createdJob);

        await createJob(request, mockResponse);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).not.toHaveBeenCalled();
        expect(mockGetNextAndPreviousRun).not.toHaveBeenCalled();
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
        expect(mockResponseJson).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    id: createdJob.id,
                    schedule: null,
                }),
            })
        );
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelegate).toHaveBeenCalledWith({
            jobId: createdJob.id,
            userId: 'user-id-1',
            name: createdJob.name,
            tools: createdJob.tools,
            scheduleType: null,
        });
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('aborts and rethrows when repository create fails before commit', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const dbError = new Error('database create failed');

        mockCreate.mockRejectedValue(dbError);

        await expect(createJob(request, mockResponse)).rejects.toThrow(dbError);

        expect(mockCommitTransaction).not.toHaveBeenCalled();
        expect(mockAbortTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).not.toHaveBeenCalled();
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockResponseStatus).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: dbError });
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('rethrows and does not abort when scheduling fails after commit', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const createdJob = buildCreatedJob(requestBody);
        const schedulingError = new Error('scheduler failed');

        mockCreate.mockResolvedValue(createdJob);
        mockSchedule.mockImplementation(() => {
            throw schedulingError;
        });

        await expect(createJob(request, mockResponse)).rejects.toThrow(schedulingError);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockResponseStatus).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: schedulingError });
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('rethrows and keeps committed transaction when register fails after response', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const createdJob = buildCreatedJob(requestBody);
        const registerError = new Error('delegator register failed');

        mockCreate.mockResolvedValue(createdJob);
        mockRegister.mockImplementation(() => {
            throw registerError;
        });

        await expect(createJob(request, mockResponse)).rejects.toThrow(registerError);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.CREATED);
        expect(mockResponseJson).toHaveBeenCalledOnce();
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to create job', { error: registerError });
        expect(mockEndSession).toHaveBeenCalledOnce();
    });
});
