import { z } from 'zod';

import constants from 'shared/constants';

import type {
    mcpAnswerEventSchema,
    mcpAnsweringEventSchema,
    mcpCallEventSchema,
    mcpErrorEventSchema,
    mcpPermissionEventSchema,
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
 * The answer is being written.
 */
type McpAnsweringEvent = z.infer<typeof mcpAnsweringEventSchema>;

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
 * Maps MCP prompt event types to their payloads.
 * Jobs keeps its own map. The emitter intersects the two.
 */
type McpEventTypeToPayloadMap = {
    [constants.events.mcp.selecting]: McpSelectingEvent;
    [constants.events.mcp.permission]: McpPermissionEvent;
    [constants.events.mcp.call]: McpCallEvent;
    [constants.events.mcp.answering]: McpAnsweringEvent;
    [constants.events.mcp.answer]: McpAnswerEvent;
    [constants.events.mcp.error]: McpErrorEvent;
    [constants.events.mcp.stopped]: McpStoppedEvent;
};

export type {
    McpEventTypeToPayloadMap,
    McpSelectingEvent,
    McpPermissionEvent,
    McpCallEvent,
    McpAnsweringEvent,
    McpAnswerEvent,
    McpErrorEvent,
    McpStoppedEvent,
};
