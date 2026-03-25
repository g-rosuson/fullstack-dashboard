import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
    CREATE_JOB_ROUTE,
    DELETE_JOB_ROUTE,
    GET_ALL_JOBS_ROUTE,
    GET_JOB_ROUTE,
    GET_STREAM_JOBS_ROUTE,
    UPDATE_JOB_ROUTE,
} from 'modules/jobs/constants';

import { jobDocumentSchema } from 'aop/db/mongo/repository/jobs/schemas';

import { createJobInputSchema, idRouteParamSchema, paginatedRouteParamSchema, updateJobInputSchema } from './schemas';
import { jobEventSchema } from 'shared/schemas/jobs/events/schemas-events';

const jobsRegistry = new OpenAPIRegistry();

jobsRegistry.registerPath({
    method: 'post',
    path: CREATE_JOB_ROUTE,
    responses: {
        200: {
            description: 'Job created successfully',
            content: {
                'application/json': {
                    schema: jobDocumentSchema,
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
    path: DELETE_JOB_ROUTE,
    responses: {
        200: {
            description: 'Job deleted successfully',
        },
    },
    request: {
        params: idRouteParamSchema,
    },
});

jobsRegistry.registerPath({
    method: 'get',
    path: GET_ALL_JOBS_ROUTE,
    responses: {
        200: {
            description: 'All jobs',
            content: {
                'application/json': {
                    schema: jobDocumentSchema.array(),
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
    path: GET_JOB_ROUTE,
    responses: {
        200: {
            description: 'Job by id',
            content: {
                'application/json': {
                    schema: jobDocumentSchema,
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
    path: UPDATE_JOB_ROUTE,
    responses: {
        200: {
            description: 'Job updated successfully',
            content: {
                'application/json': {
                    schema: jobDocumentSchema,
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
    path: GET_STREAM_JOBS_ROUTE,
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
