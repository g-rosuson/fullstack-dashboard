import { getAllJobs } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { Request, Response } from 'express';

/**
 * Mocks for the get all jobs function.
 */
const mockGetAllByUserId = vi.fn();
const mockGetNextAndPreviousRun = vi.fn();
const mockResponseStatus = vi.fn();
const mockResponseJson = vi.fn();

const mockResponse = {
    status: mockResponseStatus,
    json: mockResponseJson,
} as unknown as Response;

/**
 * Builds a request for the get all jobs function.
 * @param query Optional query params
 * @returns The request
 */
const buildRequest = (query: Record<string, string> = {}) =>
    ({
        query,
        context: {
            user: { id: 'user-id-1' },
            db: {
                repository: {
                    jobs: {
                        getAllByUserId: mockGetAllByUserId,
                    },
                },
            },
            scheduler: {
                getNextAndPreviousRun: mockGetNextAndPreviousRun,
            },
        },
    }) as unknown as Request;

describe('jobs-controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResponseStatus.mockReturnValue(mockResponse);
    });

    describe('getAllJobs', () => {
        it('should fetch paginated jobs using parsed limit and offset query params', async () => {
            const mockRequest = buildRequest({
                limit: '10',
                offset: '20',
            });
            const jobs = [
                { id: 'job-id-1', name: 'Backend jobs', schedule: null },
                { id: 'job-id-2', name: 'Frontend jobs', schedule: null },
            ];

            mockGetAllByUserId.mockResolvedValue(jobs);

            await getAllJobs(mockRequest, mockResponse);

            expect(mockGetAllByUserId).toHaveBeenCalledWith('user-id-1', 10, 20);
            expect(mockGetNextAndPreviousRun).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: jobs,
                limit: 10,
                offset: 20,
                count: 2,
            });
        });

        it('should default limit and offset to zero when query params are missing', async () => {
            const mockRequest = buildRequest();
            const jobs = [{ id: 'job-id-1', name: 'Backend jobs', schedule: null }];

            mockGetAllByUserId.mockResolvedValue(jobs);

            await getAllJobs(mockRequest, mockResponse);

            expect(mockGetAllByUserId).toHaveBeenCalledWith('user-id-1', 0, 0);
            expect(mockGetNextAndPreviousRun).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: jobs,
                limit: 0,
                offset: 0,
                count: 1,
            });
        });

        it('should enrich scheduled jobs with nextRun and lastRun from scheduler context', async () => {
            const mockRequest = buildRequest();
            const nextRun = new Date('2026-04-20T08:30:00.000Z');
            const previousRun = new Date('2026-04-19T08:30:00.000Z');
            const jobs = [
                {
                    id: 'job-id-1',
                    name: 'Scheduled jobs',
                    schedule: {
                        type: 'daily',
                        startDate: '2026-04-18T08:30:00.000Z',
                        endDate: null,
                    },
                },
                {
                    id: 'job-id-2',
                    name: 'Manual jobs',
                    schedule: null,
                },
            ];

            mockGetAllByUserId.mockResolvedValue(jobs);
            mockGetNextAndPreviousRun.mockReturnValue({ nextRun, previousRun });

            await getAllJobs(mockRequest, mockResponse);

            expect(mockGetNextAndPreviousRun).toHaveBeenCalledTimes(1);
            expect(mockGetNextAndPreviousRun).toHaveBeenCalledWith('job-id-1');
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: [
                    {
                        ...jobs[0],
                        schedule: {
                            ...jobs[0].schedule,
                            nextRun: nextRun.toISOString(),
                            lastRun: previousRun.toISOString(),
                        },
                    },
                    jobs[1],
                ],
                limit: 0,
                offset: 0,
                count: 2,
            });
        });
    });
});
