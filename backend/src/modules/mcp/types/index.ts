import { z } from 'zod';

import {
    conversationReadSchema,
    conversationSummarySchema,
    conversationTurnSchema,
    idRouteParamSchema,
    permissionInputSchema,
    promptIdSchema,
    startPromptInputSchema,
    startPromptResultSchema,
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
 * A started prompt and the turn stored for it.
 */
type StartPromptResult = z.infer<typeof startPromptResultSchema>;

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
 * One turn on a conversation read.
 */
type ConversationTurn = z.infer<typeof conversationTurnSchema>;

/**
 * A conversation and its turns.
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
    StartPromptResult,
};
