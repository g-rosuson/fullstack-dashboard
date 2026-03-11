import { getAllJobs } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { Request, Response } from 'express';

/**
 * Mocks for the get all jobs function.
 */
const mockGetAllByUserId = vi.fn();
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
                { id: 'job-id-1', name: 'Backend jobs' },
                { id: 'job-id-2', name: 'Frontend jobs' },
            ];

            mockGetAllByUserId.mockResolvedValue(jobs);

            await getAllJobs(mockRequest, mockResponse);

            expect(mockGetAllByUserId).toHaveBeenCalledWith('user-id-1', 10, 20);
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
            const jobs = [{ id: 'job-id-1', name: 'Backend jobs' }];

            mockGetAllByUserId.mockResolvedValue(jobs);

            await getAllJobs(mockRequest, mockResponse);

            expect(mockGetAllByUserId).toHaveBeenCalledWith('user-id-1', 0, 0);
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: jobs,
                limit: 0,
                offset: 0,
                count: 1,
            });
        });
    });
});
