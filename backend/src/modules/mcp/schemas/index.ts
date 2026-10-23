import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
    aggregatedPromptsEventSchema,
    mcpAnswerEventSchema,
    mcpCallFailedEventSchema,
    mcpCallProcessingEventSchema,
    mcpCallRefusedEventSchema,
    mcpCallSucceededResourceEventSchema,
    mcpCallSucceededToolEventSchema,
    mcpErrorEventSchema,
    mcpPermissionEventSchema,
    mcpPersistedPromptEventSchema,
    mcpPromptDomainSchema,
    mcpPromptListSchema,
    mcpSavingEventSchema,
    mcpSelectingEventSchema,
    mcpStoppedEventSchema,
} from 'shared/schemas/mcp/events';

extendZodWithOpenApi(z);

/**
 * Path id for a conversation or a prompt.
 */
const idRouteParamSchema = z
    .object({
        id: z.string().min(1),
    })
    .openapi('McpIdRouteParam');

/**
 * Body for starting a prompt on a conversation this user owns.
 * Omit `turnIds`, or send it empty, to use every finished turn.
 */
const startPromptInputSchema = z
    .object({
        conversationId: z.string().min(1),
        prompt: z.string().min(1),
        turnIds: z.array(z.string().min(1)).optional(),
    })
    .openapi('StartMcpPromptInput');

/**
 * Body for allowing or refusing the pending tool or resource.
 * `kind` is `tool` or `resource`. A resource template is a resource.
 */
const permissionInputSchema = z
    .object({
        domain: z.string().min(1),
        name: z.string().min(1),
        kind: z.enum(['tool', 'resource']),
    })
    .openapi('McpPermissionInput');

/**
 * Id returned when a prompt is accepted, allowed, refused, or stopped.
 */
const promptIdSchema = z
    .object({
        promptId: z.string().min(1),
    })
    .openapi('McpPromptId');

/**
 * Id returned when a conversation is created, listed, or deleted.
 */
const conversationSummarySchema = z
    .object({
        conversationId: z.string().min(1),
    })
    .openapi('McpConversationSummary');

/**
 * One finished turn on a conversation read.
 * `events` are that prompt's permission asks and call steps, oldest first.
 */
const conversationTurnSchema = z
    .object({
        turnId: z.string().min(1),
        prompt: z.string(),
        answer: z.string(),
        startedAt: z.string().datetime({ offset: true }),
        finishedAt: z.string().datetime({ offset: true }),
        domains: z.array(mcpPromptDomainSchema),
        list: mcpPromptListSchema,
        events: z.array(mcpPersistedPromptEventSchema),
    })
    .openapi('McpConversationTurn');

/**
 * A conversation and its finished turns, oldest first.
 */
const conversationReadSchema = z
    .object({
        conversationId: z.string().min(1),
        turns: z.array(conversationTurnSchema),
    })
    .openapi('McpConversation');

/**
 * One prompt event on the stream.
 */
const mcpStreamEventSchema = z
    .union([
        aggregatedPromptsEventSchema,
        mcpSelectingEventSchema,
        mcpPermissionEventSchema,
        mcpCallProcessingEventSchema,
        mcpCallSucceededToolEventSchema,
        mcpCallSucceededResourceEventSchema,
        mcpCallFailedEventSchema,
        mcpCallRefusedEventSchema,
        mcpSavingEventSchema,
        mcpAnswerEventSchema,
        mcpErrorEventSchema,
        mcpStoppedEventSchema,
    ])
    .openapi('McpStreamEvent');

export {
    conversationReadSchema,
    conversationSummarySchema,
    conversationTurnSchema,
    idRouteParamSchema,
    mcpStreamEventSchema,
    permissionInputSchema,
    promptIdSchema,
    startPromptInputSchema,
};
