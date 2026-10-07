import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import constants from 'shared/constants';

extendZodWithOpenApi(z);

/**
 * `promptId` identifies the prompt. `userId` is the owner the stream filters on.
 * It is the same id as the access token's `id` claim, so it stays on the payload.
 */
const mcpPromptEventIdentitySchema = z.object({
    promptId: z.string().min(1),
    userId: z.string().min(1),
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
 * A resource the model asked for.
 * A concrete resource has `uri`. A template has `uriTemplate`.
 */
const mcpPromptListResourceSchema = z
    .union([
        z
            .object({
                domain: z.string().min(1),
                name: z.string().min(1),
                uri: z.string().min(1),
            })
            .strict(),
        z
            .object({
                domain: z.string().min(1),
                name: z.string().min(1),
                uriTemplate: z.string().min(1),
            })
            .strict(),
    ])
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
const mcpCallProcessingEventSchema = mcpPromptCallFieldsSchema.extend({
    status: z.literal('processing'),
    kind: mcpPromptKindSchema,
});

/**
 * The tool call finished. `result` is the tool content.
 */
const mcpCallSucceededToolEventSchema = mcpPromptCallFieldsSchema.extend({
    status: z.literal('succeeded'),
    kind: z.literal('tool'),
    result: mcpPromptToolResultSchema,
});

/**
 * The resource read finished. `result` is the resource contents.
 */
const mcpCallSucceededResourceEventSchema = mcpPromptCallFieldsSchema.extend({
    status: z.literal('succeeded'),
    kind: z.literal('resource'),
    result: mcpPromptResourceResultSchema,
});

/**
 * The tool or resource failed. The prompt continues with a later step.
 */
const mcpCallFailedEventSchema = mcpPromptCallFieldsSchema.extend({
    status: z.literal('failed'),
    kind: mcpPromptKindSchema,
});

/**
 * The user refused the pending tool or resource. Sent in place of `processing`.
 */
const mcpCallRefusedEventSchema = mcpPromptCallFieldsSchema.extend({
    status: z.literal('refused'),
    kind: mcpPromptKindSchema,
});

/**
 * A tool or resource call. `result` is present only when `status` is `succeeded`.
 */
const mcpCallEventSchema = z
    .union([
        mcpCallProcessingEventSchema,
        mcpCallSucceededToolEventSchema,
        mcpCallSucceededResourceEventSchema,
        mcpCallFailedEventSchema,
        mcpCallRefusedEventSchema,
    ])
    .openapi('McpCallEvent');

/**
 * The answer is being written.
 */
const mcpAnsweringEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.answering),
    })
    .openapi('McpAnsweringEvent');

/**
 * The answer is finished.
 */
const mcpAnswerEventSchema = mcpPromptEventIdentitySchema
    .extend({
        type: z.literal(constants.events.mcp.answer),
        content: z.string().min(1),
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

export {
    mcpSelectingEventSchema,
    mcpPermissionEventSchema,
    mcpCallEventSchema,
    mcpAnsweringEventSchema,
    mcpAnswerEventSchema,
    mcpErrorEventSchema,
    mcpStoppedEventSchema,
    mcpPromptMessageSchema,
    mcpPromptListSchema,
    mcpPromptDomainSchema,
    mcpPromptToolResultSchema,
    mcpPromptResourceResultSchema,
};
