import { ObjectId } from 'mongodb';

import { ResourceNotFoundException, SchemaValidationException } from 'aop/exceptions';
import { DatabaseOperationFailedException } from 'aop/exceptions/errors/database';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { ConversationTurn } from './types';
import type { ClientSession, Db } from 'mongodb';

import { ConversationRepository } from './index';

type Stored = {
    _id: ObjectId;
    userId: string;
    turns: ConversationTurn[];
};

type Filter = {
    _id?: ObjectId;
    userId?: string;
};

const collectionName = 'test-mcp-conversations-collection';

const matches = (document: Stored, filter: Filter) => {
    if (filter._id && !document._id.equals(filter._id)) {
        return false;
    }

    if (filter.userId !== undefined && document.userId !== filter.userId) {
        return false;
    }

    return true;
};

const turn = (turnId: string, prompt: string, answer: string): ConversationTurn => ({
    turnId,
    prompt,
    answer,
    savedAt: '2026-10-07T10:00:00.000Z',
});

const createDb = () => {
    const documents: Stored[] = [];

    const insertOne = vi.fn(async (document: Stored) => {
        documents.push(document);
        return { acknowledged: true, insertedId: document._id };
    });

    const findOne = vi.fn(async (filter: Filter) => documents.find(document => matches(document, filter)) ?? null);

    const find = vi.fn((filter: Filter) => ({
        sort: () => ({
            toArray: async () =>
                documents
                    .filter(document => matches(document, filter))
                    .slice()
                    .sort((left, right) => left._id.toString().localeCompare(right._id.toString())),
        }),
    }));

    const deleteOne = vi.fn(async (filter: Filter) => {
        const index = documents.findIndex(document => matches(document, filter));

        if (index === -1) {
            return { deletedCount: 0 };
        }

        documents.splice(index, 1);
        return { deletedCount: 1 };
    });

    const findOneAndUpdate = vi.fn(async (filter: Filter, update: { $push: { turns: ConversationTurn } }) => {
        const document = documents.find(stored => matches(stored, filter));

        if (!document) {
            return null;
        }

        document.turns.push(update.$push.turns);
        return document;
    });

    const collection = vi.fn(() => ({
        insertOne,
        findOne,
        find,
        deleteOne,
        findOneAndUpdate,
    }));

    return {
        db: { collection } as unknown as Db,
        documents,
        collection,
        insertOne,
        deleteOne,
        findOneAndUpdate,
    };
};

describe('ConversationRepository', () => {
    const userId = 'user-1';
    const otherUserId = 'user-2';

    it(`[HTTP-MCP-CNV-001] creates an empty conversation in ${collectionName}`, async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const session = {} as ClientSession;

        const created = await repository.create({ userId }, session);

        expect(store.collection).toHaveBeenCalledWith(collectionName);
        expect(store.insertOne).toHaveBeenCalledWith(expect.objectContaining({ userId, turns: [] }), { session });
        expect(created).toEqual({ id: expect.any(String), userId, turns: [] });
        expect(ObjectId.isValid(created.id)).toBe(true);
    });

    it('[HTTP-MCP-CNV-002] lists only the conversations this user created, oldest first', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);

        const first = await repository.create({ userId });
        const second = await repository.create({ userId });
        await repository.create({ userId: otherUserId });

        const listed = await repository.listForUser(userId);

        expect(listed.map(conversation => conversation.id)).toEqual([first.id, second.id]);
    });

    it('[HTTP-MCP-CNV-003] reads turns oldest first', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const created = await repository.create({ userId });
        const older = turn('turn-1', 'first prompt', 'first answer');
        const newer = turn('turn-2', 'second prompt', 'second answer');

        await repository.appendTurn({ id: created.id, userId, turn: older });
        await repository.appendTurn({ id: created.id, userId, turn: newer });

        const read = await repository.getByIdForUser(created.id, userId);

        expect(read.turns).toEqual([older, newer]);
    });

    it('[HTTP-MCP-CNV-004] appends a finished turn as the new last turn', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const created = await repository.create({ userId });
        const saved = turn('turn-1', 'prompt', 'answer');
        const session = {} as ClientSession;

        const updated = await repository.appendTurn({ id: created.id, userId, turn: saved }, session);

        expect(store.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: new ObjectId(created.id), userId },
            { $push: { turns: saved } },
            { returnDocument: 'after', session }
        );
        expect(updated.turns).toEqual([saved]);
    });

    it('[HTTP-MCP-CNV-006] delete removes the conversation for a later read', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const created = await repository.create({ userId });

        const deleted = await repository.deleteForUser(created.id, userId);

        expect(deleted).toEqual({ id: created.id });
        await expect(repository.getByIdForUser(created.id, userId)).rejects.toBeInstanceOf(ResourceNotFoundException);
    });

    it('[HTTP-MCP-OWN-002] a missing id and another user’s id are the same not-found error', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const created = await repository.create({ userId });
        const missingId = new ObjectId().toString();

        const missing = await repository.getByIdForUser(missingId, userId).then(
            () => null,
            (error: unknown) => error
        );
        const foreign = await repository.getByIdForUser(created.id, otherUserId).then(
            () => null,
            (error: unknown) => error
        );
        const invalid = await repository.getByIdForUser('nope', userId).then(
            () => null,
            (error: unknown) => error
        );

        for (const error of [missing, foreign, invalid]) {
            expect(error).toBeInstanceOf(ResourceNotFoundException);
            expect(error).toMatchObject({ message: ErrorMessage.CONVERSATION_NOT_FOUND });
        }

        await expect(repository.deleteForUser(created.id, otherUserId)).rejects.toBeInstanceOf(
            ResourceNotFoundException
        );
        await expect(
            repository.appendTurn({ id: created.id, userId: otherUserId, turn: turn('turn-1', 'prompt', 'answer') })
        ).rejects.toBeInstanceOf(ResourceNotFoundException);

        const unchanged = await repository.getByIdForUser(created.id, userId);
        expect(unchanged.turns).toEqual([]);
    });

    it('rejects an empty owner and a turn without an id before writing', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);

        await expect(repository.create({ userId: '' })).rejects.toBeInstanceOf(SchemaValidationException);
        expect(store.insertOne).not.toHaveBeenCalled();

        const created = await repository.create({ userId });

        await expect(
            repository.appendTurn({
                id: created.id,
                userId,
                turn: turn('', 'prompt', 'answer'),
            })
        ).rejects.toBeInstanceOf(SchemaValidationException);

        const read = await repository.getByIdForUser(created.id, userId);
        expect(read.turns).toEqual([]);
    });

    it('rejects a stored document that does not match the schema', async () => {
        const store = createDb();
        const repository = new ConversationRepository(store.db);
        const id = new ObjectId();

        store.documents.push({ _id: id, userId, turns: undefined as unknown as ConversationTurn[] });

        await expect(repository.getByIdForUser(id.toString(), userId)).rejects.toBeInstanceOf(
            SchemaValidationException
        );
    });

    it('throws when the insert is not acknowledged', async () => {
        const insertOne = vi.fn(async () => ({ acknowledged: false, insertedId: new ObjectId() }));
        const db = {
            collection: () => ({
                insertOne,
            }),
        } as unknown as Db;
        const repository = new ConversationRepository(db);

        await expect(repository.create({ userId })).rejects.toBeInstanceOf(DatabaseOperationFailedException);
    });
});
