/** MongoDB index key specification: field name to sort order (1 ascending, -1 descending). */
type IndexKeySpec = Record<string, 1 | -1>;

/** Indexed collection settings from mongo config, consumed by MongoClientManager at startup. */
interface CollectionConfig {
    name: string;
    indexKeys: IndexKeySpec;
    unique: boolean;
    index: boolean;
    dropLegacyIndexes: string[];
}

/** Collections in the MongoDB database. */
interface Collection {
    users: CollectionConfig;
    jobs: CollectionConfig;
    conversations: CollectionConfig;
}

/** Collections in the MongoDB database. */
type Collections = keyof Collection;

/** MongoDB configuration object containing database connection details and collection settings. */
interface MongoConfig {
    db: {
        name: string;
        uri: string;
        collection: Record<Collections, CollectionConfig>;
    };
}

export type { CollectionConfig, Collection, Collections, MongoConfig, IndexKeySpec };
