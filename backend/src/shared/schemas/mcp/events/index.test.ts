import { parseSchema } from 'lib/validation';

import constants from 'shared/constants';

import {
    mcpAnswerEventSchema,
    mcpCallEventSchema,
    mcpErrorEventSchema,
    mcpPermissionEventSchema,
    mcpSelectingEventSchema,
    mcpStoppedEventSchema,
} from 'shared/schemas/mcp/events';

const promptId = 'prompt-1';
const userId = 'user-1';
const domain = 'whatsapp';
const name = 'send';
const filledArguments = { to: 'alex' };

const list = {
    tools: [
        {
            domain,
            name,
            argumentFields: [{ name: 'to', type: 'string', required: true }],
        },
    ],
    resources: [
        { domain, name: 'inbox', uri: 'whatsapp://inbox' },
        { domain, name: 'thread', uriTemplate: 'whatsapp://thread/{id}' },
    ],
};

const messages = [
    { role: 'user' as const, content: 'hello' },
    { role: 'tool' as const, content: 'sent' },
];

describe('mcp prompt event schemas', () => {
    it('[HTTP-MCP-REC-001] requires arguments on permission and on every call', () => {
        const permission = {
            type: constants.events.mcp.permission,
            promptId,
            userId,
            domain,
            name,
            kind: 'tool' as const,
            arguments: filledArguments,
        };
        const refused = {
            type: constants.events.mcp.call,
            promptId,
            userId,
            status: 'refused' as const,
            domain,
            name,
            kind: 'tool' as const,
            arguments: filledArguments,
        };

        expect(parseSchema(mcpPermissionEventSchema, permission)).toEqual({ success: true, data: permission });
        expect(parseSchema(mcpCallEventSchema, refused)).toEqual({ success: true, data: refused });
        expect(parseSchema(mcpPermissionEventSchema, { ...permission, arguments: undefined }).success).toBe(false);
        expect(parseSchema(mcpCallEventSchema, { ...refused, arguments: undefined }).success).toBe(false);
    });

    it('[HTTP-MCP-REC-002] requires result only when a call succeeded', () => {
        const toolResult = { content: [{ type: 'text', text: 'sent' }] };
        const resourceResult = {
            contents: [{ uri: 'whatsapp://inbox', mimeType: 'application/json', text: '{}' }],
        };
        const succeededTool = {
            type: constants.events.mcp.call,
            promptId,
            userId,
            status: 'succeeded' as const,
            domain,
            name,
            kind: 'tool' as const,
            arguments: filledArguments,
            result: toolResult,
        };
        const succeededResource = {
            ...succeededTool,
            name: 'inbox',
            kind: 'resource' as const,
            arguments: {},
            result: resourceResult,
        };
        const failed = {
            type: constants.events.mcp.call,
            promptId,
            userId,
            status: 'failed' as const,
            domain,
            name,
            kind: 'resource' as const,
            arguments: filledArguments,
        };

        expect(parseSchema(mcpCallEventSchema, succeededTool)).toEqual({ success: true, data: succeededTool });
        expect(parseSchema(mcpCallEventSchema, succeededResource)).toEqual({
            success: true,
            data: succeededResource,
        });
        expect(parseSchema(mcpCallEventSchema, { ...succeededTool, result: undefined }).success).toBe(false);
        expect(parseSchema(mcpCallEventSchema, failed)).toEqual({ success: true, data: failed });
    });

    it('[HTTP-MCP-REC-003] carries messages, domains, and list on answer', () => {
        const answer = {
            type: constants.events.mcp.answer,
            promptId,
            userId,
            content: 'done',
            startedAt: '2026-01-01T12:00:00.000Z',
            finishedAt: '2026-01-01T12:00:01.000Z',
            domains: [{ name: domain, tools: [{ name }], resources: [{ name: 'inbox' }] }],
            list,
            messages,
        };

        expect(parseSchema(mcpAnswerEventSchema, answer)).toEqual({ success: true, data: answer });
        expect(parseSchema(mcpAnswerEventSchema, { ...answer, list: undefined }).success).toBe(false);
        expect(
            parseSchema(mcpAnswerEventSchema, {
                ...answer,
                list: {
                    ...list,
                    resources: [
                        { domain, name: 'inbox', uri: 'whatsapp://inbox', uriTemplate: 'whatsapp://thread/{id}' },
                    ],
                },
            }).success
        ).toBe(false);
    });

    it('[HTTP-MCP-REC-003] omits list on stopped when the model has not asked for it', () => {
        const stopped = {
            type: constants.events.mcp.stopped,
            promptId,
            userId,
            messages: [],
        };
        const stoppedWithList = { ...stopped, list };

        expect(parseSchema(mcpStoppedEventSchema, stopped)).toEqual({ success: true, data: stopped });
        expect(parseSchema(mcpStoppedEventSchema, stoppedWithList)).toEqual({ success: true, data: stoppedWithList });
    });

    it('[HTTP-MCP-FLR-002] requires a non-empty error context', () => {
        const errorEvent = {
            type: constants.events.mcp.error,
            promptId,
            userId,
            context: 'provider failed',
            messages: [],
        };

        expect(parseSchema(mcpErrorEventSchema, errorEvent)).toEqual({ success: true, data: errorEvent });
        expect(parseSchema(mcpErrorEventSchema, { ...errorEvent, context: '' }).success).toBe(false);
        expect(parseSchema(mcpErrorEventSchema, { ...errorEvent, context: undefined }).success).toBe(false);
    });

    it('requires userId so the stream can filter by owner', () => {
        const selecting = {
            type: constants.events.mcp.selecting,
            promptId,
            userId,
        };

        expect(parseSchema(mcpSelectingEventSchema, selecting)).toEqual({ success: true, data: selecting });
        expect(parseSchema(mcpSelectingEventSchema, { type: selecting.type, promptId }).success).toBe(false);
    });
});
