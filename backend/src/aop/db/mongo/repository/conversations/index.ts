import { ClientSession, Db, ObjectId } from 'mongodb';

import { ResourceNotFoundException, SchemaValidationException } from 'aop/exceptions';
import { DatabaseOperationFailedException } from 'aop/exceptions/errors/database';
import { parseSchema } from 'lib/validation';

import config from '../../config';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { AppendTurnPayload, Conversation, ConversationDocument, CreateConversationPayload } from './types';

import { conversationDocumentSchema, conversationTurnSchema, deleteConversationResultSchema } from './schemas';

/**
 * Persistence for conversations. A missing id and another user's id are the same miss.
 * Callers append a turn only after a finished answer. Stop and error do not call {@link appendTurn}.
 */
class ConversationRepository {
    private readonly db: Db;
    private readonly collectionName: string;

    constructor(db: Db) {
        this.db = db;
        this.collectionName = config.db.collection.conversations.name;
    }

    /**
     * Starts an empty conversation for this user.
     *
     * @param payload Owner of the new conversation
     * @param session Optional Mongo session for transactional contexts
     * @returns The created conversation
     */
    async create(payload: CreateConversationPayload, session?: ClientSession): Promise<Conversation> {
        const conversationDocument: ConversationDocument = {
            _id: new ObjectId(),
            userId: payload.userId,
            turns: [],
        };

        const parsed = this.parseDocument(conversationDocument);

        const created = await this.db
            .collection<ConversationDocument>(this.collectionName)
            .insertOne(parsed, { session });

        if (!created.acknowledged) {
            throw new DatabaseOperationFailedException(ErrorMessage.DATABASE_OPERATION_FAILED_ERROR);
        }

        return this.toConversation(parsed);
    }

    /**
     * Lists every conversation this user created, oldest first.
     *
     * @param userId The user whose conversations to list
     * @returns Conversations owned by that user
     */
    async listForUser(userId: string): Promise<Conversation[]> {
        const documents = await this.db
            .collection<ConversationDocument>(this.collectionName)
            .find({ userId })
            .sort({ _id: 1 })
            .toArray();

        return documents.map(document => this.toConversation(this.parseDocument(document)));
    }

    /**
     * Reads one conversation when this user owns it.
     *
     * @param id Conversation id
     * @param userId Owner to match
     * @returns The conversation, turns oldest first
     * @throws ResourceNotFoundException when the id is missing or owned by someone else
     */
    async getByIdForUser(id: string, userId: string): Promise<Conversation> {
        const document = await this.db
            .collection<ConversationDocument>(this.collectionName)
            .findOne({ _id: this.objectIdFor(id), userId });

        if (!document) {
            throw new ResourceNotFoundException(ErrorMessage.CONVERSATION_NOT_FOUND);
        }

        return this.toConversation(this.parseDocument(document));
    }

    /**
     * Removes one conversation when this user owns it.
     *
     * @param id Conversation id
     * @param userId Owner to match
     * @param session Optional Mongo session for transactional contexts
     * @returns The deleted conversation id
     * @throws ResourceNotFoundException when the id is missing or owned by someone else
     */
    async deleteForUser(id: string, userId: string, session?: ClientSession): Promise<{ id: string }> {
        const deleteResult = await this.db
            .collection<ConversationDocument>(this.collectionName)
            .deleteOne({ _id: this.objectIdFor(id), userId }, { ...(session ? { session } : {}) });

        if (deleteResult.deletedCount === 0) {
            throw new ResourceNotFoundException(ErrorMessage.CONVERSATION_NOT_FOUND);
        }

        const parsed = parseSchema(deleteConversationResultSchema, { id });

        if (!parsed.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: parsed.issues });
        }

        return parsed.data;
    }

    /**
     * Appends one finished turn. Turns stay in the order they were saved.
     *
     * @param payload Conversation id, owner, and the turn to store
     * @param session Optional Mongo session for transactional contexts
     * @returns The conversation after the turn is saved
     * @throws ResourceNotFoundException when the id is missing or owned by someone else
     */
    async appendTurn(payload: AppendTurnPayload, session?: ClientSession): Promise<Conversation> {
        const turnResult = parseSchema(conversationTurnSchema, payload.turn);

        if (!turnResult.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: turnResult.issues });
        }

        const updated = await this.db.collection<ConversationDocument>(this.collectionName).findOneAndUpdate(
            { _id: this.objectIdFor(payload.id), userId: payload.userId },
            { $push: { turns: turnResult.data } },
            {
                returnDocument: 'after',
                ...(session ? { session } : {}),
            }
        );

        if (!updated) {
            throw new ResourceNotFoundException(ErrorMessage.CONVERSATION_NOT_FOUND);
        }

        return this.toConversation(this.parseDocument(updated));
    }

    /**
     * Turns an id into an ObjectId, or reports the conversation missing.
     * An id MongoDB cannot use is the same miss as an id that is not in the collection.
     */
    private objectIdFor(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new ResourceNotFoundException(ErrorMessage.CONVERSATION_NOT_FOUND);
        }

        return new ObjectId(id);
    }

    /**
     * Validates a document read from MongoDB or built for insert.
     */
    private parseDocument(document: unknown): ConversationDocument {
        const result = parseSchema(conversationDocumentSchema, document);

        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: result.issues });
        }

        return result.data;
    }

    /**
     * Replaces MongoDB `_id` with a string `id`.
     */
    private toConversation(document: ConversationDocument): Conversation {
        const { _id, ...rest } = document;

        return {
            id: _id.toString(),
            ...rest,
        };
    }
}

export { ConversationRepository };
