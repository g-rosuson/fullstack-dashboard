import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import {
    CREATE_JOB_ROUTE,
    DELETE_JOB_ROUTE,
    GET_ALL_JOBS_ROUTE,
    GET_JOB_ROUTE,
    UPDATE_JOB_ROUTE,
} from 'modules/jobs/constants';

import { jobDocumentSchema } from 'aop/db/mongo/repository/jobs/schemas';

import { createJobInputSchema, idRouteParamSchema, paginatedRouteParamSchema, updateJobInputSchema } from './schemas';

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
            description: 'Job payload',
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
            description: 'Job',
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
            description: 'Job payload',
            content: {
                'application/json': {
                    schema: updateJobInputSchema,
                },
            },
        },
    },
});

export default jobsRegistry;
