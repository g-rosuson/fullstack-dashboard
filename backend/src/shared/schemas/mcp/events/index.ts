import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import constants from 'shared/constants';

extendZodWithOpenApi(z);

/**
 * `promptId` identifies the prompt. `conversationId` is the conversation the prompt runs in.
 * `userId` is the owner the stream filters on.
 * It is the same id as the access token's `id` claim, so it stays on the payload.
 */
const mcpPromptEventIdentitySchema = z.object({
    promptId: z.string().min(1),
    userId: z.string().min(1),
    conversationId: z.string().min(1),
});

/**
 * Whether the selected item is a tool or a resource. A resource template is a resource.
 */
const mcpPromptKindSchema = z.enum(['tool', 'resource']);

/**
 * Arguments the model filled for one tool or resource. A concrete resource may send an empty object.
 */
const mcpPromptArgumentsSchema = z.record(z.string(), z.unknown());

/**
 * An ISO-8601 timestamp with an offset, such as `2026-01-01T12:00:00.000Z`.
 */
const isoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * One message passed to the model.
 */
const mcpPromptMessageSchema = z
    .object({
        role: z.enum(['user', 'assistant', 'tool', 'resource']),
        content: z.string(),
    })
    .openapi('McpPromptMessage');

/**
 * One argument field on a listed tool: name, type, and whether it is required.
 */
const mcpPromptListArgumentFieldSchema = z
    .object({
        name: z.string().min(1),
        type: z.string().min(1),
        required: z.boolean(),
    })
    .openapi('McpPromptListArgumentField');

/**
 * A tool the model asked for.
 */
const mcpPromptListToolSchema = z
    .object({
        domain: z.string().min(1),
        name: z.string().min(1),
        argumentFields: z.array(mcpPromptListArgumentFieldSchema),
    })
    .openapi('McpPromptListTool');

/**
 * A concrete resource the model asked for. It has a fixed `uri`.
 */
const mcpPromptListResourceUriSchema = z
    .object({
        domain: z.string().min(1),
        name: z.string().min(1),
        uri: z.string().min(1),
    })
    .strict()
    .openapi('McpPromptListResourceUri');

/**
 * A resource template the model asked for. Its URI depends on the prompt.
 */
const mcpPromptListResourceTemplateSchema = z
    .object({
        domain: z.string().min(1),
        name: z.string().min(1),
        uriTemplate: z.string().min(1),
    })
    .strict()
    .openapi('McpPromptListResourceTemplate');

/**
 * A resource the model asked for.
 * A concrete resource has `uri`. A template has `uriTemplate`.
 */
const mcpPromptListResourceSchema = z
    .union([mcpPromptListResourceUriSchema, mcpPromptListResourceTemplateSchema])
    .openapi('McpPromptListResource');

/**
 * The tools and resources the model asked for.
 */
const mcpPromptListSchema = z
    .object({
        tools: z.array(mcpPromptListToolSchema),
        resources: z.array(mcpPromptListResourceSchema),
    })
    .openapi('McpPromptList');

/**
 * Tools and resources a finished answer used, each name once, under its domain.
 */
const mcpPromptDomainSchema = z
    .object({
        name: z.string().min(1),
        tools: z.array(z.object({ name: z.string().min(1) })),
        resources: z.array(z.object({ name: z.string().min(1) })),
    })
    .openapi('McpPromptDomain');

/**
 * Result of a succeeded tool call.
 */
const mcpPromptToolResultSchema = z
    .object({
        content: z.array(
            z.object({
                type: z.string().min(1),
                text: z.string().optional(),
            })
        ),
        isError: z.boolean().optional(),
    })
    .openapi('McpPromptToolResult');

/**
 * Result of a succeeded resource read.
 */
const mcpPromptResourceResultSchema = z
    .object({
        contents: z.array(
            z.object({
                uri: z.string().min(1),
                mimeType: z.string().optional(),
                text: z.string().optional(),
            })
        ),
    })
    .openapi('McpPromptResourceResult');

/**
 * The model is asking for the list of tools and resources.
 */
const mcpSelectingEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.selecting),
    })
    .openapi('McpSelectingEvent');

/**
 * The model selected one tool or resource and filled its arguments.
 */
const mcpPermissionEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.permission),
        domain: z.string().min(1),
        name: z.string().min(1),
        kind: mcpPromptKindSchema,
        arguments: mcpPromptArgumentsSchema,
    })
    .openapi('McpPermissionEvent');

/**
 * Fields shared by every `call` event: the prompt, the item, and the arguments from its `permission` event.
 */
const mcpPromptCallFieldsSchema = mcpPromptEventIdentitySchema.extend({
    type: z.literal(constants.events.mcp.call),
    domain: z.string().min(1),
    name: z.string().min(1),
    arguments: mcpPromptArgumentsSchema,
});

/**
 * The tool or resource is running. Sent before `succeeded` or `failed` for the same item.
 */
const mcpCallProcessingEventSchema = mcpPromptCallFieldsSchema
    .extend({
        status: z.literal('processing'),
        kind: mcpPromptKindSchema,
    })
    .openapi('McpCallProcessingEvent');

/**
 * The tool call finished. `result` is the tool content.
 */
const mcpCallSucceededToolEventSchema = mcpPromptCallFieldsSchema
    .extend({
        status: z.literal('succeeded'),
        kind: z.literal('tool'),
        result: mcpPromptToolResultSchema,
    })
    .openapi('McpCallSucceededToolEvent');

/**
 * The resource read finished. `result` is the resource contents.
 */
const mcpCallSucceededResourceEventSchema = mcpPromptCallFieldsSchema
    .extend({
        status: z.literal('succeeded'),
        kind: z.literal('resource'),
        result: mcpPromptResourceResultSchema,
    })
    .openapi('McpCallSucceededResourceEvent');

/**
 * The tool or resource failed. The prompt continues with a later step.
 */
const mcpCallFailedEventSchema = mcpPromptCallFieldsSchema
    .extend({
        status: z.literal('failed'),
        kind: mcpPromptKindSchema,
    })
    .openapi('McpCallFailedEvent');

/**
 * The user refused the pending tool or resource. Sent in place of `processing`.
 */
const mcpCallRefusedEventSchema = mcpPromptCallFieldsSchema
    .extend({
        status: z.literal('refused'),
        kind: mcpPromptKindSchema,
    })
    .openapi('McpCallRefusedEvent');

/**
 * A tool or resource call. `result` is present only when `status` is `succeeded`.
 * Validation only. The stream schema lists each variant so OpenAPI keeps their names.
 */
const mcpCallEventSchema = z.union([
    mcpCallProcessingEventSchema,
    mcpCallSucceededToolEventSchema,
    mcpCallSucceededResourceEventSchema,
    mcpCallFailedEventSchema,
    mcpCallRefusedEventSchema,
]);

/**
 * The finished answer is being saved.
 */
const mcpSavingEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.saving),
    })
    .openapi('McpSavingEvent');

/**
 * The answer is finished.
 */
const mcpAnswerEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.answer),
        content: z.string().min(1),
        prompt: z.string().min(1),
        turnId: z.string().min(1),
        startedAt: isoDateTimeSchema,
        finishedAt: isoDateTimeSchema,
        domains: z.array(mcpPromptDomainSchema),
        list: mcpPromptListSchema,
        messages: z.array(mcpPromptMessageSchema),
    })
    .openapi('McpAnswerEvent');

/**
 * The model provider or the server failed. `list` is present only after the model asked for it.
 */
const mcpErrorEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.error),
        context: z.string().min(1),
        messages: z.array(mcpPromptMessageSchema),
        list: mcpPromptListSchema.optional(),
    })
    .openapi('McpErrorEvent');

/**
 * The prompt was stopped. `list` is present only after the model asked for it.
 */
const mcpStoppedEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.stopped),
        messages: z.array(mcpPromptMessageSchema),
        list: mcpPromptListSchema.optional(),
    })
    .openapi('McpStoppedEvent');

/**
 * Phase of a prompt that is still being answered.
 * A turn save that has started is `saving`.
 * `answer`, `error`, and `stopped` are not in this set: those prompts have left the active set.
 */
const mcpPromptPhaseSchema = z.enum(['selecting', 'permission', 'calling', 'saving']);

/**
 * Steps stored for a prompt until it leaves the active set.
 * `answer`, `error`, and `stopped` are live only.
 */
const mcpPromptReplayEventSchema = z.union([
    mcpSelectingEventSchema,
    mcpPermissionEventSchema,
    mcpCallEventSchema,
    mcpSavingEventSchema,
]);

/**
 * One prompt still being answered, with the steps already emitted for it, oldest first.
 */
const aggregatedPromptSchema = z
    .object({
        promptId: z.string().min(1),
        conversationId: z.string().min(1),
        prompt: z.string().min(1),
        phase: mcpPromptPhaseSchema,
        emittedEvents: z.array(mcpPromptReplayEventSchema),
    })
    .openapi('AggregatedPrompt');

/**
 * Connect snapshot of every prompt this user still has in progress.
 */
const aggregatedPromptsEventSchema = z
    .object({
        userId: z.string().min(1),
        type: z.literal(constants.events.mcp.promptsAggregated),
        prompts: z.array(aggregatedPromptSchema),
    })
    .openapi('AggregatedPromptsEvent');

/**
 * Permission and call steps stored on a finished turn, without `promptId`, `userId`, and `conversationId`.
 * `selecting`, `saving`, `answer`, `error`, and `stopped` are not in this set.
 */
const mcpPersistedPermissionEventSchema = mcpPermissionEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedPermissionEvent');

const mcpPersistedCallProcessingEventSchema = mcpCallProcessingEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedCallProcessingEvent');

const mcpPersistedCallSucceededToolEventSchema = mcpCallSucceededToolEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedCallSucceededToolEvent');

const mcpPersistedCallSucceededResourceEventSchema = mcpCallSucceededResourceEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedCallSucceededResourceEvent');

const mcpPersistedCallFailedEventSchema = mcpCallFailedEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedCallFailedEvent');

const mcpPersistedCallRefusedEventSchema = mcpCallRefusedEventSchema
    .omit({ promptId: true, userId: true, conversationId: true })
    .openapi('McpPersistedCallRefusedEvent');

const mcpPersistedPromptEventSchema = z
    .union([
        mcpPersistedPermissionEventSchema,
        mcpPersistedCallProcessingEventSchema,
        mcpPersistedCallSucceededToolEventSchema,
        mcpPersistedCallSucceededResourceEventSchema,
        mcpPersistedCallFailedEventSchema,
        mcpPersistedCallRefusedEventSchema,
    ])
    .openapi('McpPersistedPromptEvent');

export {
    aggregatedPromptsEventSchema,
    aggregatedPromptSchema,
    mcpSelectingEventSchema,
    mcpPermissionEventSchema,
    mcpCallProcessingEventSchema,
    mcpCallSucceededToolEventSchema,
    mcpCallSucceededResourceEventSchema,
    mcpCallFailedEventSchema,
    mcpCallRefusedEventSchema,
    mcpCallEventSchema,
    mcpSavingEventSchema,
    mcpAnswerEventSchema,
    mcpErrorEventSchema,
    mcpStoppedEventSchema,
    mcpPersistedPermissionEventSchema,
    mcpPersistedCallProcessingEventSchema,
    mcpPersistedCallSucceededToolEventSchema,
    mcpPersistedCallSucceededResourceEventSchema,
    mcpPersistedCallFailedEventSchema,
    mcpPersistedCallRefusedEventSchema,
    mcpPersistedPromptEventSchema,
    mcpPromptMessageSchema,
    mcpPromptListSchema,
    mcpPromptDomainSchema,
    mcpPromptToolResultSchema,
    mcpPromptResourceResultSchema,
};
