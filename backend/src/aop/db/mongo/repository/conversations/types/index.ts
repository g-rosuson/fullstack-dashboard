import { z } from 'zod';

import {
    conversationDocumentSchema,
    conversationTurnSchema,
    deleteConversationResultSchema,
    finishedTurnSchema,
} from '../schemas';

/**
 * A conversation as stored in MongoDB.
 */
type ConversationDocument = z.infer<typeof conversationDocumentSchema>;

/**
 * A turn stored on a conversation. A prompt has no answer until that answer is saved.
 */
type ConversationTurn = z.infer<typeof conversationTurnSchema>;

/**
 * A turn whose answer has been saved.
 */
type FinishedConversationTurn = z.infer<typeof finishedTurnSchema>;

/**
 * A conversation returned to callers, with `_id` normalized to `id`.
 */
type Conversation = Omit<ConversationDocument, '_id'> & {
    id: string;
};

/**
 * Fields required to start a conversation.
 */
type CreateConversationPayload = Pick<ConversationDocument, 'userId'>;

/**
 * A prompt to store before its answer.
 */
type AppendOpenTurnPayload = {
    id: string;
    userId: string;
    turn: {
        turnId: string;
        prompt: string;
        startedAt: string;
    };
};

/**
 * A finished turn to append, or to write onto the prompt waiting for it.
 */
type AppendTurnPayload = {
    id: string;
    userId: string;
    turn: FinishedConversationTurn;
};

/**
 * The waiting prompt to remove when its answer is stopped or fails.
 */
type RemoveOpenTurnPayload = {
    id: string;
    userId: string;
    turnId: string;
};

/**
 * Result of deleting one conversation.
 */
type DeleteConversationResult = z.infer<typeof deleteConversationResultSchema>;

export type {
    AppendOpenTurnPayload,
    AppendTurnPayload,
    Conversation,
    ConversationDocument,
    ConversationTurn,
    CreateConversationPayload,
    DeleteConversationResult,
    FinishedConversationTurn,
    RemoveOpenTurnPayload,
};
