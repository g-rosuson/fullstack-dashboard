const mockLoggerError = vi.hoisted(() => vi.fn());

import { BusinessLogicException } from 'aop/exceptions';

import { updateJob } from '../jobs-controller';

import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam, UpdateJobInput } from '../types';
import type { Request, Response } from 'express';

const mockUpdate = vi.fn();
const mockSchedule = vi.fn();
const mockGetNextAndPreviousRun = vi.fn();
const mockDelete = vi.fn();
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

vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: mockLoggerError,
    },
}));

const mockResponse = {
    status: mockResponseStatus,
    json: mockResponseJson,
} as unknown as Response;

const now = new Date('2026-03-10T12:00:00.000Z').toISOString();
const scheduledStartDate = new Date('2026-03-11T08:30:00.000Z').toISOString();
const enrichedNextRun = new Date('2026-03-18T08:30:00.000Z');

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
            type: 'scraper' as const,
            keywords: ['typescript', 'node'],
            maxPages: 3,
            targets: [
                {
                    target: 'jobs-ch' as const,
                    keywords: ['hybrid'],
                    maxPages: 2,
                },
            ],
        },
    ],
    runJob: true,
});

/**
 * Builds a request for the update job function.
 * @param body The request body
 * @param runningJobIds The IDs of the running jobs
 * @returns The request
 */
const buildRequest = (
    body: UpdateJobInput,
    runningJobIds: string[] = []
): Request<IdRouteParam, unknown, UpdateJobInput> =>
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
                delete: mockDelete,
                getNextAndPreviousRun: mockGetNextAndPreviousRun,
            },
            delegator: {
                runningJobs: new Map(runningJobIds.map(jobId => [jobId, { userId: 'user-id-1' }])),
                register: mockRegister,
                delegate: mockDelegate,
            },
        },
    }) as unknown as Request<IdRouteParam, unknown, UpdateJobInput>;

/**
 * Builds a updated job object.
 * @param body The request body
 * @returns The updated job object
 */
const buildUpdatedJob = (body: UpdateJobInput) => ({
    id: 'job-id-1',
    userId: 'user-id-1',
    name: body.name,
    schedule: body.schedule,
    tools: [
        { toolId: 'tool-id-1', ...body.tools[0], targets: [{ targetId: 'target-id-1', ...body.tools[0].targets[0] }] },
    ],
    createdAt: new Date('2026-03-01T12:00:00.000Z').toISOString(),
    updatedAt: now,
});

/** Expected shape of tools after real `mapToIds` (IDs are opaque strings). */
const expectMappedUpdateTools = () =>
    expect.arrayContaining([
        expect.objectContaining({
            type: 'scraper',
            toolId: expect.any(String),
            keywords: ['typescript', 'node'],
            maxPages: 3,
            targets: expect.arrayContaining([
                expect.objectContaining({
                    target: 'jobs-ch',
                    keywords: ['hybrid'],
                    maxPages: 2,
                    targetId: expect.any(String),
                }),
            ]),
        }),
    ]);

describe('jobs-controller updateJob', () => {
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

    it('updates a scheduled job, responds with enriched schedule, and registers it', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const updatedJob = buildUpdatedJob(requestBody);

        mockUpdate.mockResolvedValue(updatedJob);

        await updateJob(request, mockResponse);

        expect(mockStartSession).toHaveBeenCalledOnce();
        expect(mockStartTransaction).toHaveBeenCalledOnce();
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'job-id-1',
                userId: 'user-id-1',
                name: requestBody.name,
                schedule: requestBody.schedule,
                tools: expectMappedUpdateTools(),
                updatedAt: now,
            }),
            mockSession
        );
        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).toHaveBeenCalledWith({
            name: requestBody.name,
            type: requestBody.schedule?.type,
            startDate: requestBody.schedule?.startDate,
            endDate: requestBody.schedule?.endDate,
            jobId: 'job-id-1',
        });
        expect(mockGetNextAndPreviousRun).toHaveBeenCalledWith('job-id-1');
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(mockResponseJson).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    id: updatedJob.id,
                    userId: updatedJob.userId,
                    name: updatedJob.name,
                    schedule: expect.objectContaining({
                        type: 'weekly',
                        startDate: scheduledStartDate,
                        endDate: null,
                        nextRun: enrichedNextRun.toISOString(),
                        lastRun: null,
                    }),
                }),
            })
        );
        expect(mockRegister).toHaveBeenCalledWith({
            jobId: 'job-id-1',
            userId: 'user-id-1',
            name: requestBody.name,
            tools: expect.any(Array),
            scheduleType: requestBody.schedule?.type,
        });
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('deletes scheduler entry and delegates when schedule is null and runJob is true', async () => {
        const requestBody: UpdateJobInput = {
            ...buildRequestBody(),
            schedule: null,
            runJob: true,
        };
        const request = buildRequest(requestBody);
        const updatedJob = buildUpdatedJob(requestBody);

        mockUpdate.mockResolvedValue(updatedJob);

        await updateJob(request, mockResponse);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).not.toHaveBeenCalled();
        expect(mockGetNextAndPreviousRun).not.toHaveBeenCalled();
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(mockResponseJson).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    id: updatedJob.id,
                    schedule: null,
                }),
            })
        );
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelete).toHaveBeenCalledWith('job-id-1');
        expect(mockDelegate).toHaveBeenCalledWith({
            jobId: 'job-id-1',
            userId: 'user-id-1',
            name: requestBody.name,
            tools: expect.any(Array),
            scheduleType: null,
        });
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('deletes scheduler entry and does not delegate when schedule is null and runJob is false', async () => {
        const requestBody: UpdateJobInput = {
            ...buildRequestBody(),
            schedule: null,
            runJob: false,
        };
        const request = buildRequest(requestBody);

        mockUpdate.mockResolvedValue(buildUpdatedJob(requestBody));

        await updateJob(request, mockResponse);

        expect(mockDelete).toHaveBeenCalledWith('job-id-1');
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockSchedule).not.toHaveBeenCalled();
    });

    it('aborts and rethrows when update is attempted on a running job', async () => {
        const request = buildRequest(buildRequestBody(), ['job-id-1']);

        await expect(updateJob(request, mockResponse)).rejects.toThrow(BusinessLogicException);

        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockCommitTransaction).not.toHaveBeenCalled();
        expect(mockAbortTransaction).toHaveBeenCalledOnce();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', {
            error: expect.objectContaining({
                message: ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING,
            }),
        });
        expect(mockResponseStatus).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('aborts and rethrows when repository update fails before commit', async () => {
        const request = buildRequest(buildRequestBody());
        const updateError = new Error('database update failed');

        mockUpdate.mockRejectedValue(updateError);

        await expect(updateJob(request, mockResponse)).rejects.toThrow(updateError);

        expect(mockCommitTransaction).not.toHaveBeenCalled();
        expect(mockAbortTransaction).toHaveBeenCalledOnce();
        expect(mockSchedule).not.toHaveBeenCalled();
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: updateError });
        expect(mockResponseStatus).not.toHaveBeenCalled();
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('rethrows and does not abort when scheduling fails after commit', async () => {
        const requestBody = buildRequestBody();
        const request = buildRequest(requestBody);
        const schedulingError = new Error('scheduler failed');

        mockUpdate.mockResolvedValue(buildUpdatedJob(requestBody));
        mockSchedule.mockImplementation(() => {
            throw schedulingError;
        });

        await expect(updateJob(request, mockResponse)).rejects.toThrow(schedulingError);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockRegister).not.toHaveBeenCalled();
        expect(mockDelete).not.toHaveBeenCalled();
        expect(mockDelegate).not.toHaveBeenCalled();
        expect(mockResponseStatus).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: schedulingError });
        expect(mockEndSession).toHaveBeenCalledOnce();
    });

    it('rethrows and keeps committed transaction when delegate fails after response', async () => {
        const requestBody: UpdateJobInput = {
            ...buildRequestBody(),
            schedule: null,
            runJob: true,
        };
        const request = buildRequest(requestBody);
        const delegateError = new Error('delegator delegate failed');

        mockUpdate.mockResolvedValue(buildUpdatedJob(requestBody));
        mockDelegate.mockImplementation(() => {
            throw delegateError;
        });

        await expect(updateJob(request, mockResponse)).rejects.toThrow(delegateError);

        expect(mockCommitTransaction).toHaveBeenCalledOnce();
        expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
        expect(mockResponseJson).toHaveBeenCalledOnce();
        expect(mockDelete).toHaveBeenCalledWith('job-id-1');
        expect(mockAbortTransaction).not.toHaveBeenCalled();
        expect(mockLoggerError).toHaveBeenCalledWith('Failed to update cron job', { error: delegateError });
        expect(mockEndSession).toHaveBeenCalledOnce();
    });
});
