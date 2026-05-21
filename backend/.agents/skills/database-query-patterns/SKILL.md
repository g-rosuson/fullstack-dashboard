---
name: database-query-patterns
description: Implement MongoDB data access using the repository pattern, Zod document schema validation on every read, and MongoDB sessions for multi-write transactions. Covers UserRepository and JobsRepository conventions, parseSchema usage, and the isCommitted transaction guard. Use when adding new repository methods, new collections, or transactional write flows.
---

# Purpose

Ensure all database access goes through typed repository classes with Zod validation on every document read and correct session handling for atomic writes.

# When To Use

- Adding a new method to `UserRepository` or `JobsRepository`.
- Creating a new repository for a new collection.
- Implementing a controller action that requires multiple atomic writes.
- Debugging document shape errors (`SchemaValidationException`) or transaction failures.

# Required Patterns

## Repository pattern

- All MongoDB operations MUST be in repository classes under `aop/db/mongo/repository/`.
- Repositories receive a `Db` instance on construction. Collection name from `config.db.collection.<name>.name`.
- `db.collection()` is ONLY called inside repository methods — never in controllers, middleware, or services.

## Zod validation on every read

Every document returned from MongoDB MUST be validated before use:

```typescript
import { parseSchema } from 'lib/validation';
import { SchemaValidationException } from 'aop/exceptions';
import { ErrorMessage } from 'shared/enums/error-messages';

const doc = await this.db.collection(this.collectionName).findOne({ email });

if (!doc) return null;

const result = parseSchema(userDocumentSchema, doc);

if (!result.success) {
    throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
        issues: result.issues,
    });
}

return result.data;   // typed, validated document
```

`parseSchema` returns `{ success: true, data: T } | { success: false, issues: ZodIssue[] }`. Always check `result.success` before accessing `result.data`.

## Transaction pattern

Use MongoDB sessions for writes that must be atomic across multiple operations:

```typescript
const session = req.context.db.transaction.startSession();
let isCommitted = false;

try {
    session.startTransaction();

    // DB operations — pass session to each write
    const created = await req.context.db.repository.jobs.create(payload, session);

    await session.commitTransaction();
    isCommitted = true;

    // Post-commit side effects (scheduling, delegation) come AFTER commit
    req.context.scheduler.schedule({ ... });

} catch (error) {
    if (!isCommitted) {
        await session.abortTransaction();
    }
    logger.error('Operation failed', { error: error as Error });
    throw error;   // re-throw for exceptionsMiddleware
} finally {
    await session.endSession();  // always called
}
```

Key rules:
- `isCommitted` flag prevents double-abort if commit fails mid-way.
- Side effects (scheduler, delegator) happen AFTER `commitTransaction` — not before.
- `endSession()` is always in `finally` — never conditional.

# Implementation Steps

## Adding a method to an existing repository

1. Add the method signature to the class with typed parameters.
2. Use `this.db.collection(this.collectionName)` to access the collection.
3. For reads: validate the result with `parseSchema(documentSchema, rawDoc)`.
4. For writes: accept an optional `ClientSession` parameter; pass it to the MongoDB operation.
5. Return the typed validated result.

## Creating a new repository

1. Create `aop/db/mongo/repository/<name>/index.ts`.
2. Define a Zod document schema in `aop/db/mongo/repository/<name>/schemas/`.
3. Create types with `z.infer<typeof documentSchema>`.
4. Class constructor: `constructor(private db: Db) {}`.
5. Set `this.collectionName = config.db.collection.<name>.name`.
6. Wire the new repository into the context at `aop/db/mongo/context/` and register in the server bootstrap.

# Examples

## Read — findOne with parseSchema

```typescript
async getByEmail(email: string) {
    const userDocument = await this.db
        .collection(this.collectionName)
        .findOne({ email });

    if (!userDocument) return null;

    const result = parseSchema(userDocumentSchema, userDocument);

    if (!result.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: result.issues,
        });
    }

    return result.data;
}
```

## Read — find many with validation

```typescript
async getAllByUserId(userId: string, limit: number, offset: number) {
    const docs = await this.db
        .collection(this.collectionName)
        .find({ userId })
        .skip(offset)
        .limit(limit)
        .toArray();

    return docs.map(doc => {
        const result = parseSchema(jobDocumentSchema, doc);
        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: result.issues,
            });
        }
        return result.data;
    });
}
```

## Write — insertOne with optional session

```typescript
async create(payload: CreateJobPayload, session?: ClientSession) {
    const result = await this.db
        .collection(this.collectionName)
        .insertOne(payload, { session });

    return { ...payload, id: result.insertedId.toString() };
}
```

## Scoped query — always filter by userId

```typescript
async getById(id: string, userId: string) {
    const doc = await this.db
        .collection(this.collectionName)
        .findOne({ _id: new ObjectId(id), userId });

    if (!doc) throw new ResourceNotFoundException(ErrorMessage.JOB_NOT_FOUND);

    const result = parseSchema(jobDocumentSchema, doc);
    if (!result.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: result.issues,
        });
    }

    return result.data;
}
```

# Edge Cases

- **Transactions require a replica set**: The Docker Compose stack provisions MongoDB with `rs0`. Standalone instances do not support transactions — ensure the integration test environment uses the replica set config.
- **`isCommitted` guard**: If `commitTransaction()` itself throws (rare but possible), the transaction is in an unknown state. The `isCommitted = true` assignment is placed immediately after the await to minimize the gap.
- **MongoDB 11000**: Duplicate unique key errors are caught and converted to `ConflictException` by `exceptionsMiddleware` automatically — do not manually catch code `11000` in repositories.
- **ObjectId conversion**: MongoDB `_id` is `ObjectId`; controllers need a string `id`. Convert with `doc._id.toString()` in the repository return value.

# Anti-Patterns

- **Never** call `db.collection()` outside a repository class.
- **Never** return raw MongoDB documents without `parseSchema` validation.
- **Never** schedule cron jobs or delegate work before `commitTransaction()`.
- **Never** call `abortTransaction()` after the transaction has already committed.
- **Never** create additional `MongoClient` instances — use the one in `aop/db`.
- **Never** run transactions on a standalone MongoDB instance.
- **Never** manually catch error code `11000` — let `exceptionsMiddleware` handle it.
- **Never** filter jobs without scoping by `userId` — prevents cross-user data leakage.

# Validation Checklist

- [ ] All `findOne` / `find` results validated with `parseSchema` before use
- [ ] `SchemaValidationException` thrown on parse failure
- [ ] Write methods accept optional `ClientSession` and pass it to MongoDB
- [ ] Transaction: `isCommitted` guard present; `endSession()` in `finally`
- [ ] Post-commit side effects (scheduler, delegator) placed after `commitTransaction()`
- [ ] All job queries scoped by `userId`
- [ ] No direct `db.collection()` calls outside repository classes
- [ ] Collection name from `config.db.collection.<name>.name`
