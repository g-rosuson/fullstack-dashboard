import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import constants from 'shared/constants';

import {
    conversationReadSchema,
    conversationSummarySchema,
    idRouteParamSchema,
    mcpStreamEventSchema,
    permissionInputSchema,
    promptIdSchema,
    startPromptInputSchema,
} from './schemas';

const mcpRegistry = new OpenAPIRegistry();

mcpRegistry.registerPath({
    method: 'get',
    path: constants.routes.mcp.stream,
    summary: 'Stream prompt events for the authenticated user',
    responses: {
        200: {
            description: 'Server-sent events for this user. An open permission is sent again on connect.',
            content: {
                'text/event-stream': {
                    schema: mcpStreamEventSchema,
                },
            },
        },
    },
});

mcpRegistry.registerPath({
    method: 'post',
    path: constants.routes.mcp.createConversation,
    summary: 'Start an empty conversation',
    responses: {
        200: {
            description: 'Conversation created',
            content: {
                'application/json': {
                    schema: conversationSummarySchema,
                },
            },
        },
    },
});

mcpRegistry.registerPath({
    method: 'get',
    path: constants.routes.mcp.listConversations,
    summary: 'List conversations for the authenticated user',
    responses: {
        200: {
            description: 'Conversations this user created, oldest first',
            content: {
                'application/json': {
                    schema: conversationSummarySchema.array(),
                },
            },
        },
    },
});

mcpRegistry.registerPath({
    method: 'get',
    path: constants.routes.mcp.getConversation,
    summary: 'Read one conversation',
    request: {
        params: idRouteParamSchema,
    },
    responses: {
        200: {
            description: 'Finished turns, oldest first',
            content: {
                'application/json': {
                    schema: conversationReadSchema,
                },
            },
        },
        404: {
            description: 'Conversation is missing or owned by someone else',
        },
    },
});

mcpRegistry.registerPath({
    method: 'delete',
    path: constants.routes.mcp.deleteConversation,
    summary: 'Delete one conversation',
    request: {
        params: idRouteParamSchema,
    },
    responses: {
        200: {
            description: 'Conversation deleted',
            content: {
                'application/json': {
                    schema: conversationSummarySchema,
                },
            },
        },
        404: {
            description: 'Conversation is missing or owned by someone else',
        },
    },
});

mcpRegistry.registerPath({
    method: 'post',
    path: constants.routes.mcp.startPrompt,
    summary: 'Start a prompt in a conversation',
    request: {
        body: {
            description: 'Conversation, prompt, and optional finished-turn ids',
            content: {
                'application/json': {
                    schema: startPromptInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Prompt is being answered',
            content: {
                'application/json': {
                    schema: promptIdSchema,
                },
            },
        },
        404: {
            description: 'Conversation is missing or owned by someone else',
        },
        422: {
            description: 'A turn id is not a finished turn, or the conversation already has a prompt being answered',
        },
    },
});

mcpRegistry.registerPath({
    method: 'post',
    path: constants.routes.mcp.permitPrompt,
    summary: 'Allow the pending tool or resource',
    request: {
        params: idRouteParamSchema,
        body: {
            description: 'Domain, name, and kind from the open permission event',
            content: {
                'application/json': {
                    schema: permissionInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'The pending call will run',
            content: {
                'application/json': {
                    schema: promptIdSchema,
                },
            },
        },
        404: {
            description: 'Prompt is unknown or owned by someone else',
        },
        422: {
            description: 'Nothing is pending, or the body is a different item',
        },
    },
});

mcpRegistry.registerPath({
    method: 'post',
    path: constants.routes.mcp.refusePrompt,
    summary: 'Refuse the pending tool or resource',
    request: {
        params: idRouteParamSchema,
        body: {
            description: 'Domain, name, and kind from the open permission event',
            content: {
                'application/json': {
                    schema: permissionInputSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'The pending call will be refused and the prompt continues',
            content: {
                'application/json': {
                    schema: promptIdSchema,
                },
            },
        },
        404: {
            description: 'Prompt is unknown or owned by someone else',
        },
        422: {
            description: 'Nothing is pending, or the body is a different item',
        },
    },
});

mcpRegistry.registerPath({
    method: 'post',
    path: constants.routes.mcp.stopPrompt,
    summary: 'Stop a prompt that is being answered',
    request: {
        params: idRouteParamSchema,
    },
    responses: {
        200: {
            description: 'Stop accepted. The stopped event follows this response.',
            content: {
                'application/json': {
                    schema: promptIdSchema,
                },
            },
        },
        404: {
            description: 'Prompt is unknown or owned by someone else',
        },
        422: {
            description: 'This user owns the prompt and it is not being answered',
        },
    },
});

export default mcpRegistry;
