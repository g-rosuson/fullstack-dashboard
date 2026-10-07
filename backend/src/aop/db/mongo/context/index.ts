import type { Transaction } from './types';
import type { Db } from 'mongodb';

import { ConversationRepository } from '../repository/conversations';
import { JobRepository } from '../repository/jobs';
import { UserRepository } from '../repository/user';

/**
 * DbContext is the primary abstraction layer for all database operations in the application.
 * It wraps the core MongoDB database instance, provides access to domain-centric repository classes,
 * and exposes transaction utilities for supporting advanced data operations like atomic multi-step actions.
 *
 * Key responsibilities:
 * - Provides a strongly-typed interface to domain repositories (users, jobs, conversations)
 * - Handles MongoDB transaction/session management for atomicity and data consistency
 * - Facilitates clean, testable architecture by isolating database infrastructure concerns
 * - Promotes consistent database access patterns throughout the project
 *
 * Usage: Available as req.context.db within Express middleware/routes
 * Example: req.context.db.repository.users.getByEmail('user@example.com')
 * Example (transaction): const session = req.context.db.transaction.startSession();
 */
export class DbContext {
    /** The underlying MongoDB database instance */
    private readonly db: Db;
    /** Repository for database collections operations */
    public readonly repository: {
        users: UserRepository;
        jobs: JobRepository;
        conversations: ConversationRepository;
    };
    /** Transaction for database operations */
    public readonly transaction: Transaction;

    /**
     * Creates a new DbContext instance.
     * @param db The MongoDB Db instance
     * @param transaction The transaction for database operations
     */
    constructor(db: Db, transaction: Transaction) {
        this.db = db;
        this.repository = {
            users: new UserRepository(db),
            jobs: new JobRepository(db),
            conversations: new ConversationRepository(db),
        };
        this.transaction = transaction;
    }

    /**
     * Provides direct access to the underlying MongoDB database instance.
     * Use sparingly - prefer using domain repositories when possible.
     * Useful for advanced operations not covered by repositories.
     *
     * @returns The MongoDB Db instance
     */
    get dbInstance() {
        return this.db;
    }
}
