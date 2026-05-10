import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import constants from 'shared/constants';

import {
    createJobInputSchema,
    enrichedJobSchema,
    idRouteParamSchema,
    paginatedRouteParamSchema,
    updateJobInputSchema,
} from './schemas';
import { deleteJobResultSchema } from 'shared/schemas/jobs';
import { jobEventSchema } from 'shared/schemas/jobs/events/schemas-events';

const jobsRegistry = new OpenAPIRegistry();

jobsRegistry.registerPath({
    method: 'post',
    path: constants.routes.jobs.create,
    responses: {
        200: {
            description: 'Job created successfully',
            content: {
                'application/json': {
                    schema: enrichedJobSchema,
                },
            },
        },
    },
    request: {
        body: {
            description: 'Create job payload',
            content: {
                'application/json': {
                    schema: createJobInputSchema,
                },
            },
        },
    },
});

jobsRegistry.registerPath({
    method: 'delete',
    path: constants.routes.jobs.delete,
    responses: {
        200: {
            description: 'Job deleted successfully',
            content: {
                'application/json': {
                    schema: deleteJobResultSchema,
                },
            },
        },
    },
    request: {
        params: idRouteParamSchema,
    },
});

jobsRegistry.registerPath({
    method: 'get',
    path: constants.routes.jobs.getAll,
    responses: {
        200: {
            description: 'All jobs',
            content: {
                'application/json': {
                    schema: enrichedJobSchema.array(),
                },
            },
        },
    },
    request: {
        params: paginatedRouteParamSchema,
    },
});

jobsRegistry.registerPath({
    method: 'get',
    path: constants.routes.jobs.getById,
    responses: {
        200: {
            description: 'Job by id',
            content: {
                'application/json': {
                    schema: enrichedJobSchema,
                },
            },
        },
    },
    request: {
        params: idRouteParamSchema,
    },
});

jobsRegistry.registerPath({
    method: 'put',
    path: constants.routes.jobs.update,
    responses: {
        200: {
            description: 'Job updated successfully',
            content: {
                'application/json': {
                    schema: enrichedJobSchema,
                },
            },
        },
    },
    request: {
        params: idRouteParamSchema,
        body: {
            description: 'Update job payload',
            content: {
                'application/json': {
                    schema: updateJobInputSchema,
                },
            },
        },
    },
});

jobsRegistry.registerPath({
    method: 'get',
    path: constants.routes.jobs.streamAll,
    responses: {
        200: {
            description: 'Server-sent events stream of job execution updates',
            content: {
                'text/event-stream': {
                    schema: jobEventSchema,
                },
            },
        },
    },
});

export default jobsRegistry;
