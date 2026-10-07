import type { Conversation } from 'aop/db/mongo/repository/conversations/types';

import type { ConversationRead, ConversationSummary } from '../types';

/**
 * The conversation id the HTTP responses return.
 * The store calls this field `id`.
 *
 * @param conversation Conversation this user owns
 * @returns `{ conversationId }`
 */
const toConversationSummary = (conversation: Conversation): ConversationSummary => ({
    conversationId: conversation.id,
});

/**
 * A conversation read: finished turns, oldest first, without store-only fields.
 *
 * @param conversation Conversation this user owns
 * @returns The conversation id and its turns
 */
const toConversationRead = (conversation: Conversation): ConversationRead => ({
    conversationId: conversation.id,
    turns: conversation.turns.map(turn => ({
        turnId: turn.turnId,
        prompt: turn.prompt,
        answer: turn.answer,
    })),
});

export { toConversationRead, toConversationSummary };
