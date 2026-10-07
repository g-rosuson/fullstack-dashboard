import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * One finished prompt and its answer, stored oldest first.
 */
const conversationTurnSchema = z.object({
    turnId: z.string().min(1),
    prompt: z.string(),
    answer: z.string(),
    savedAt: z.string().datetime({ offset: true }),
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
