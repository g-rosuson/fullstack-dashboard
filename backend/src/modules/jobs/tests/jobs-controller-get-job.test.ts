import { getJob } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam } from '../types';
import type { Request, Response } from 'express';

/**
 * Mocks for the get job function.
 */
const mockGetById = vi.fn();
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
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: job,
            });
        });
    });
});
