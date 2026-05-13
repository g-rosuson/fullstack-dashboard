import { SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import { ErrorMessage } from 'shared/enums/error-messages';

import {
    accessTokenSecretSchema,
    dbRetryDelayMsSchema,
    enableHttpRateLimitSchema,
    enableLoggingSchema,
    maxDbRetriesSchema,
    mongoDbNameSchema,
    mongoJobsCollectionNameSchema,
    mongoUriSchema,
    mongoUserCollectionNameSchema,
    refreshTokenSecretSchema,
} from '../schemas';

/**
 * Validates common environment variables required for all environments.
 *
 * Validates:
 * - ACCESS_TOKEN_SECRET (required, non-empty string)
 * - REFRESH_TOKEN_SECRET (required, non-empty string)
 * - MONGO_URI (required, valid URL)
 * - MONGO_DB_NAME (required, non-empty string)
 * - MONGO_USER_COLLECTION_NAME (required, non-empty string)
 * - MONGO_JOBS_COLLECTION_NAME (required, non-empty string)
 * - MAX_DB_RETRIES (optional, positive integer, default: 3)
 * - DB_RETRY_DELAY_MS (optional, positive integer, default: 5000)
 *
 * @returns Validated common configuration
 * @throws SchemaValidationException if validation fails
 */
export const validateCommonEnvironmentVariables = () => {
    const accessTokenSecretResult = parseSchema(accessTokenSecretSchema, process.env.ACCESS_TOKEN_SECRET);

    if (!accessTokenSecretResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: accessTokenSecretResult.issues,
        });
    }

    const refreshTokenSecretResult = parseSchema(refreshTokenSecretSchema, process.env.REFRESH_TOKEN_SECRET);

    if (!refreshTokenSecretResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: refreshTokenSecretResult.issues,
        });
    }

    const mongoUriResult = parseSchema(mongoUriSchema, process.env.MONGO_URI);

    if (!mongoUriResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mongoUriResult.issues,
        });
    }

    const mongoDbNameResult = parseSchema(mongoDbNameSchema, process.env.MONGO_DB_NAME);

    if (!mongoDbNameResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mongoDbNameResult.issues,
        });
    }

    const maxDbRetriesResult = parseSchema(maxDbRetriesSchema, process.env.MAX_DB_RETRIES);

    if (!maxDbRetriesResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: maxDbRetriesResult.issues,
        });
    }

    const dbRetryDelayMsResult = parseSchema(dbRetryDelayMsSchema, process.env.DB_RETRY_DELAY_MS);

    if (!dbRetryDelayMsResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: dbRetryDelayMsResult.issues,
        });
    }

    const mongoUserCollectionNameResult = parseSchema(
        mongoUserCollectionNameSchema,
        process.env.MONGO_USER_COLLECTION_NAME
    );

    if (!mongoUserCollectionNameResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mongoUserCollectionNameResult.issues,
        });
    }

    const mongoJobsCollectionNameResult = parseSchema(
        mongoJobsCollectionNameSchema,
        process.env.MONGO_JOBS_COLLECTION_NAME
    );

    if (!mongoJobsCollectionNameResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mongoJobsCollectionNameResult.issues,
        });
    }

    const enableHttpRateLimitResult = parseSchema(enableHttpRateLimitSchema, process.env.ENABLE_HTTP_RATE_LIMIT);

    if (!enableHttpRateLimitResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: enableHttpRateLimitResult.issues,
        });
    }

    const enableHttpRateLimit = enableHttpRateLimitResult.data === 'true';

    const enableLoggingResult = parseSchema(enableLoggingSchema, process.env.ENABLE_LOGGING);

    if (!enableLoggingResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: enableLoggingResult.issues,
        });
    }

    const enableLogging = enableLoggingResult.data === 'true';

    return {
        accessTokenSecret: accessTokenSecretResult.data,
        refreshTokenSecret: refreshTokenSecretResult.data,
        mongoURI: mongoUriResult.data,
        mongoDBName: mongoDbNameResult.data,
        mongoUserCollectionName: mongoUserCollectionNameResult.data,
        mongoJobsCollectionName: mongoJobsCollectionNameResult.data,
        maxDbRetries: maxDbRetriesResult.data,
        dbRetryDelayMs: dbRetryDelayMsResult.data,
        enableLogging,
        enableHttpRateLimit,
    };
};
