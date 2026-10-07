import { z } from 'zod';

import { conversationDocumentSchema, conversationTurnSchema, deleteConversationResultSchema } from '../schemas';

/**
 * A conversation as stored in MongoDB.
 */
type ConversationDocument = z.infer<typeof conversationDocumentSchema>;

/**
 * A finished turn stored on a conversation.
 */
type ConversationTurn = z.infer<typeof conversationTurnSchema>;

/**
 * A conversation returned to callers, with `_id` normalized to `id`.
 */
type Conversation = Omit<ConversationDocument, '_id'> & {
    id: string;
};

/**
 * Fields required to start an empty conversation.
 */
type CreateConversationPayload = Pick<ConversationDocument, 'userId'>;

/**
 * A finished turn to append to a conversation the user owns.
 */
type AppendTurnPayload = {
    id: string;
    userId: string;
    turn: ConversationTurn;
};

/**
 * Result of deleting one conversation.
 */
type DeleteConversationResult = z.infer<typeof deleteConversationResultSchema>;

export type {
    AppendTurnPayload,
    Conversation,
    ConversationDocument,
    ConversationTurn,
    CreateConversationPayload,
    DeleteConversationResult,
};
