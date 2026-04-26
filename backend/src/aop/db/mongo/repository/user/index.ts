import { Db } from 'mongodb';

import { SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import config from '../../config';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { CreateUserPayload } from './types';

import { userDocumentSchema } from './schemas';

/**
 * UserRepository encapsulates all user-related database operations.
 * This repository pattern provides a clean abstraction over MongoDB operations,
 * ensuring consistent data access patterns and enabling easy testing.
 *
 * Key features:
 * - Type-safe operations using the User interface
 * - Encapsulated collection access
 * - Domain-specific method names (getByEmail vs generic findOne)
 * - Centralized user data logic
 *
 * Usage: Access via DbContext.user property
 * Example: await dbContext.user.getByEmail('user@example.com')
 */
export class UserRepository {
    private db: Db;
    private collectionName: string;

    /**
     * Constructs a new UserRepository instance.
     *
     * @param db MongoDB database instance to perform operations on
     */
    constructor(db: Db) {
        this.db = db;
        this.collectionName = config.db.collection.users.name;
    }

    /**
     * Retrieves a user document by email address.
     * Email is used as the unique identifier for users in the system.
     *
     * @param email The email address to search for
     * @returns Promise resolving to the user document if found, null otherwise
     */
    async getByEmail(email: string) {
        const userDocument = await this.db.collection(this.collectionName).findOne({ email });

        if (!userDocument) {
            return null;
        }

        const result = parseSchema(userDocumentSchema, userDocument);

        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues: result.issues });
        }

        return result.data;
    }

    /**
     * Creates a new user document in the database.
     * The email field must be unique due to the index constraint.
     *
     * @param user User object containing all required user data
     * @returns Promise resolving to MongoDB's InsertOneResult
     * @throws Error if user with same email already exists (duplicate key error)
     */
    async create(user: CreateUserPayload) {
        return await this.db.collection(this.collectionName).insertOne(user);
    }
}
