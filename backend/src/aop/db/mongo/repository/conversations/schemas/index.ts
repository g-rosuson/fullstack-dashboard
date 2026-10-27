import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { mcpPersistedPromptEventSchema, mcpPromptDomainSchema, mcpPromptListSchema } from 'shared/schemas/mcp/events';

/**
 * One turn, oldest first.
 * An opening prompt has no `answer` or `finishedAt` until that answer is saved.
 * `events` are that prompt's permission asks and call steps, in the order they happened.
 */
const conversationTurnSchema = z.object({
    turnId: z.string().min(1),
    prompt: z.string(),
    answer: z.string().optional(),
    startedAt: z.string().datetime({ offset: true }),
    finishedAt: z.string().datetime({ offset: true }).optional(),
    domains: z.array(mcpPromptDomainSchema),
    list: mcpPromptListSchema,
    events: z.array(mcpPersistedPromptEventSchema),
});

/**
 * A turn whose answer has been saved.
 */
const finishedTurnSchema = conversationTurnSchema.extend({
    answer: z.string(),
    finishedAt: z.string().datetime({ offset: true }),
});

/**
 * A conversation document. `turns` holds finished answers, and at most the opening prompt before its answer.
 */
const conversationDocumentSchema = z.object({
    _id: z.instanceof(ObjectId),
    userId: z.string().min(1),
    turns: z.array(conversationTurnSchema),
});

/**
 * Result of deleting one conversation.
 */
const deleteConversationResultSchema = z.object({
    id: z.string().min(1),
});

export { conversationDocumentSchema, conversationTurnSchema, deleteConversationResultSchema, finishedTurnSchema };
