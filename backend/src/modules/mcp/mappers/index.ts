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
 * A conversation read: finished turns, oldest first, including the steps saved with each answer.
 *
 * @param conversation Conversation this user owns
 * @returns The conversation id and its turns
 */
const toConversationRead = (conversation: Conversation): ConversationRead => ({
    conversationId: conversation.id,
    turns: conversation.turns.map(turn => ({
        turnId: turn.turnId,
        prompt: turn.prompt,
        ...(turn.answer !== undefined ? { answer: turn.answer } : {}),
        startedAt: turn.startedAt,
        ...(turn.finishedAt !== undefined ? { finishedAt: turn.finishedAt } : {}),
        domains: turn.domains,
        list: turn.list,
        events: turn.events,
    })),
});

export { toConversationRead, toConversationSummary };
