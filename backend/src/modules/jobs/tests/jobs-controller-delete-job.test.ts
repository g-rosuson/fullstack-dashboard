import { deleteJob } from '../jobs-controller';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam } from '../types';
import type { Request, Response } from 'express';

/**
 * Mocks for the delete job function.
 */
const mockDelete = vi.fn();
const mockResponseStatus = vi.fn();
const mockResponseJson = vi.fn();

const mockResponse = {
    status: mockResponseStatus,
    json: mockResponseJson,
} as unknown as Response;

/**
 * Builds a request for the delete job function.
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
                        delete: mockDelete,
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

    describe('deleteJob', () => {
        it('should delete a job and respond with the deleted payload', async () => {
            const mockRequest = buildRequest();
            const deleteResult = {
                deletedCount: 1,
                acknowledged: true,
            };

            mockDelete.mockResolvedValue(deleteResult);

            await deleteJob(mockRequest, mockResponse);

            expect(mockDelete).toHaveBeenCalledWith('job-id-1', 'user-id-1');
            expect(mockResponseStatus).toHaveBeenCalledWith(HttpStatusCode.OK);
            expect(mockResponseJson).toHaveBeenCalledWith({
                success: true,
                data: {
                    ...deleteResult,
                    id: 'job-id-1',
                },
            });
        });
    });
});
