import { z } from 'zod';

import constants from 'shared/constants';

import type {
    aggregatedPromptsEventSchema,
    mcpAnswerEventSchema,
    mcpCallEventSchema,
    mcpErrorEventSchema,
    mcpPermissionEventSchema,
    mcpPersistedPromptEventSchema,
    mcpSavingEventSchema,
    mcpSelectingEventSchema,
    mcpStoppedEventSchema,
} from 'shared/schemas/mcp/events';

/**
 * The model is asking for the list of tools and resources.
 */
type McpSelectingEvent = z.infer<typeof mcpSelectingEventSchema>;

/**
 * The model selected one tool or resource and filled its arguments.
 */
type McpPermissionEvent = z.infer<typeof mcpPermissionEventSchema>;

/**
 * A tool or resource call.
 */
type McpCallEvent = z.infer<typeof mcpCallEventSchema>;

/**
 * The finished answer is being saved.
 */
type McpSavingEvent = z.infer<typeof mcpSavingEventSchema>;

/**
 * The answer is finished.
 */
type McpAnswerEvent = z.infer<typeof mcpAnswerEventSchema>;

/**
 * The model provider or the server failed.
 */
type McpErrorEvent = z.infer<typeof mcpErrorEventSchema>;

/**
 * The prompt was stopped.
 */
type McpStoppedEvent = z.infer<typeof mcpStoppedEventSchema>;

/**
 * A permission ask or call step stored on a finished turn.
 * The stream identity is not part of it.
 */
type McpPersistedPromptEvent = z.infer<typeof mcpPersistedPromptEventSchema>;

/**
 * Steps kept for a prompt that is still being answered: `selecting`, `permission`, `call`, and `saving`.
 */
type McpBufferedPromptEvent = McpSelectingEvent | McpPermissionEvent | McpCallEvent | McpSavingEvent;

/**
 * Connect snapshot of prompts this user still has in progress.
 */
type AggregatedPromptsEvent = z.infer<typeof aggregatedPromptsEventSchema>;

/**
 * Maps MCP prompt event types to their payloads.
 * Jobs keeps its own map. The emitter intersects the two.
 */
type McpEventTypeToPayloadMap = {
    [constants.events.mcp.promptEvents]: AggregatedPromptsEvent;
    [constants.events.mcp.selecting]: McpSelectingEvent;
    [constants.events.mcp.permission]: McpPermissionEvent;
    [constants.events.mcp.call]: McpCallEvent;
    [constants.events.mcp.saving]: McpSavingEvent;
    [constants.events.mcp.answer]: McpAnswerEvent;
    [constants.events.mcp.error]: McpErrorEvent;
    [constants.events.mcp.stopped]: McpStoppedEvent;
};

export type {
    AggregatedPromptsEvent,
    McpBufferedPromptEvent,
    McpEventTypeToPayloadMap,
    McpSelectingEvent,
    McpPermissionEvent,
    McpCallEvent,
    McpSavingEvent,
    McpAnswerEvent,
    McpErrorEvent,
    McpStoppedEvent,
    McpPersistedPromptEvent,
};
