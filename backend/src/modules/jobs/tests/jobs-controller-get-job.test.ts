import { getJob } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam } from '../types';
import type { Request, Response } from 'express';

/**
 * Mocks for the get job function.
 */
const mockGetById = vi.fn();
const mockGetNextAndPreviousRun = vi.fn();
const mockResponseStatus = vi.fn();
const mockResponseJson = vi.fn();

const mockResponse = {
    status: mockResponseStatus,
    json: mockResponseJson,
} as unknown as Response;

/**
 * Builds a request for the get job function.
 * @returns The request
 */
const buildRequest = () =>
    ({
        params: {
            id: 'job-id-1',
        },
        context: {
            user: { id: 'user-id-1' },
            db: {
                repository: {
                    jobs: {
                        getById: mockGetById,
                    },
                },
            },
            scheduler: {
                getNextAndPreviousRun: mockGetNextAndPreviousRun,
            },
        },
    }) as unknown as Request<IdRouteParam>;

describe('jobs-controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResponseStatus.mockReturnValue(mockResponse);
    });

    describe('getJob', () => {
        it('should fetch a job by id and respond with the job', async () => {
            const mockRequest = buildRequest();
            const job = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: 'Backend jobs',
                schedule: null,
                tools: [],
            };

            mockGetById.mockResolvedValue(job);

            await getJob(mockRequest, mockResponse);

            expect(mockGetById).toHaveBeenCalledWith('job-id-1', 'user-id-1');
            expect(mockGetNextAndPreviousRun).not.toHaveBeenCalled();
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: job,
            });
        });

        it('should enrich schedule with nextRun and lastRun from scheduler context', async () => {
            const mockRequest = buildRequest();
            const nextRun = new Date('2026-04-20T08:30:00.000Z');
            const previousRun = new Date('2026-04-19T08:30:00.000Z');
            const job = {
                id: 'job-id-1',
                userId: 'user-id-1',
                name: 'Backend jobs',
                schedule: {
                    type: 'daily',
                    startDate: '2026-04-18T08:30:00.000Z',
                    endDate: null,
                },
                tools: [],
            };

            mockGetById.mockResolvedValue(job);
            mockGetNextAndPreviousRun.mockReturnValue({ nextRun, previousRun });

            await getJob(mockRequest, mockResponse);

            expect(mockGetNextAndPreviousRun).toHaveBeenCalledWith('job-id-1');
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: {
                    ...job,
                    schedule: {
                        ...job.schedule,
                        nextRun: nextRun.toISOString(),
                        lastRun: previousRun.toISOString(),
                    },
                },
            });
        });
    });
});
