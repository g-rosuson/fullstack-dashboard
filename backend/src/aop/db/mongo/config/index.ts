import config from 'config';

import type { MongoConfig } from '../shared/types';

/**
 * MongoDB configuration object containing database connection details and collection settings.
 * This configuration drives the database initialization, indexing, and repository setup.
 */
const mongoConfig = {
    db: {
        name: config.mongoDBName,
        uri: config.mongoURI,
        collection: {
            users: {
                name: config.mongoUserCollectionName,
                indexKeys: { email: 1 as const },
                unique: true,
                index: true,
                dropLegacyIndexes: [],
            },
            jobs: {
                name: config.mongoJobsCollectionName,
                indexKeys: { userId: 1 as const, name: 1 as const },
                unique: true,
                index: true,
                dropLegacyIndexes: ['name_1'],
            },
            conversations: {
                name: config.mongoMcpConversationsCollectionName,
                indexKeys: { userId: 1 as const },
                unique: false,
                index: true,
                dropLegacyIndexes: [],
            },
        },
    },
} satisfies MongoConfig;

export default mongoConfig;
