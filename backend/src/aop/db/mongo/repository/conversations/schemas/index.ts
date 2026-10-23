import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { mcpPersistedPromptEventSchema, mcpPromptDomainSchema, mcpPromptListSchema } from 'shared/schemas/mcp/events';

/**
 * One finished prompt and its answer, stored oldest first.
 * `events` are that prompt's permission asks and call steps, in the order they happened.
 */
const conversationTurnSchema = z.object({
    turnId: z.string().min(1),
    prompt: z.string(),
    answer: z.string(),
    startedAt: z.string().datetime({ offset: true }),
    finishedAt: z.string().datetime({ offset: true }),
    domains: z.array(mcpPromptDomainSchema),
    list: mcpPromptListSchema,
    events: z.array(mcpPersistedPromptEventSchema),
});

/**
 * A conversation document. `turns` holds finished answers only.
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

export { conversationDocumentSchema, conversationTurnSchema, deleteConversationResultSchema };
