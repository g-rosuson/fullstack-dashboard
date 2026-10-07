import { z } from 'zod';

import {
    conversationReadSchema,
    conversationSummarySchema,
    conversationTurnSchema,
    idRouteParamSchema,
    permissionInputSchema,
    promptIdSchema,
    startPromptInputSchema,
} from '../schemas';

/**
 * Path id for a conversation or a prompt.
 */
type IdRouteParam = z.infer<typeof idRouteParamSchema>;

/**
 * Body for starting a prompt.
 */
type StartPromptInput = z.infer<typeof startPromptInputSchema>;

/**
 * Body for allowing or refusing the pending tool or resource.
 */
type PermissionInput = z.infer<typeof permissionInputSchema>;

/**
 * Prompt id in a success response.
 */
type PromptId = z.infer<typeof promptIdSchema>;

/**
 * Conversation id in a create, list, or delete response.
 */
type ConversationSummary = z.infer<typeof conversationSummarySchema>;

/**
 * One finished turn on a conversation read.
 */
type ConversationTurn = z.infer<typeof conversationTurnSchema>;

/**
 * A conversation and its finished turns.
 */
type ConversationRead = z.infer<typeof conversationReadSchema>;

export type {
    ConversationRead,
    ConversationSummary,
    ConversationTurn,
    IdRouteParam,
    PermissionInput,
    PromptId,
    StartPromptInput,
};
