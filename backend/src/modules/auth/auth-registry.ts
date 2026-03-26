import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { LOGIN_ROUTE, REFRESH_ROUTE, REGISTER_ROUTE } from './constants';

import { accessTokenSchema, loginUserInputSchema, registerUserInputSchema } from './schemas';

const authRegistry = new OpenAPIRegistry();

authRegistry.registerPath({
    method: 'post',
    path: LOGIN_ROUTE,
    responses: {
        200: {
            description: 'Authentication payload when login is successful',
            content: {
                'application/json': {
                    schema: accessTokenSchema,
                },
            },
        },
    },
    request: {
        body: {
            description: 'Login payload',
            content: {
                'application/json': {
                    schema: loginUserInputSchema,
                },
            },
        },
    },
});

authRegistry.registerPath({
    method: 'post',
    path: REGISTER_ROUTE,
    responses: {
        200: {
            description: 'Authentication payload when registration is successful',
            content: {
                'application/json': {
                    schema: accessTokenSchema,
                },
            },
        },
    },
    request: {
        body: {
            description: 'Register payload',
            content: {
                'application/json': {
                    schema: registerUserInputSchema,
                },
            },
        },
    },
});

authRegistry.registerPath({
    method: 'get',
    path: REFRESH_ROUTE,
    responses: {
        200: {
            description: 'Authentication payload when refreshing access-token is successful',
            content: {
                'application/json': {
                    schema: accessTokenSchema,
                },
            },
        },
    },
});

export default authRegistry;
