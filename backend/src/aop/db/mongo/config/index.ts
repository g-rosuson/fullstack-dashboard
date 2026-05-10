import config from 'config';

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
                // Field to create index on (e.g., 'email')
                targetField: 'email',
                // Index sort order: 1 for ascending, -1 for descending
                targetValue: 1,
                // Whether the index should enforce uniqueness
                unique: true,
                // Whether to create an index for this collection at startup
                index: true,
            },
            jobs: {
                name: config.mongoJobsCollectionName,
                // Field to create index on (e.g., 'name')
                // TODO: job.name should be unique per user, not globally.
                targetField: 'name',
                // Index sort order: 1 for ascending, -1 for descending
                targetValue: 1,
                // Enforce unique job names for clear identification in dashboards
                unique: true,
                // Whether to create an index for this collection at startup
                index: true,
            },
        },
    },
};

export default mongoConfig;
