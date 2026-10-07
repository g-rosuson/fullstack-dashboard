import { SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import { ErrorMessage } from 'shared/enums/error-messages';

import {
    accessTokenSecretSchema,
    dbRetryDelayMsSchema,
    enableHttpRateLimitSchema,
    enableLoggingSchema,
    enableRegistrationSchema,
    maxDbRetriesSchema,
    mcpServerUrlSchema,
    mongoDbNameSchema,
    mongoJobsCollectionNameSchema,
    mongoMcpConversationsCollectionNameSchema,
    mongoUriSchema,
    mongoUserCollectionNameSchema,
    openRouterApiKeySchema,
    openRouterModelSchema,
    portSchema,
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
 * - MONGO_MCP_CONVERSATIONS_COLLECTION_NAME (required, non-empty string)
 * - OPENROUTER_API_KEY (required, non-empty string)
 * - OPENROUTER_MODEL (required, non-empty string)
 * - MCP_SERVER_URL (required, valid URL)
 * - MAX_DB_RETRIES (optional, positive integer, default: 3)
 * - DB_RETRY_DELAY_MS (optional, positive integer, default: 5000)
 * - ENABLE_REGISTRATION (required, "true" or "false")
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

    const mongoMcpConversationsCollectionNameResult = parseSchema(
        mongoMcpConversationsCollectionNameSchema,
        process.env.MONGO_MCP_CONVERSATIONS_COLLECTION_NAME
    );

    if (!mongoMcpConversationsCollectionNameResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mongoMcpConversationsCollectionNameResult.issues,
        });
    }

    const openRouterApiKeyResult = parseSchema(openRouterApiKeySchema, process.env.OPENROUTER_API_KEY);

    if (!openRouterApiKeyResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: openRouterApiKeyResult.issues,
        });
    }

    const openRouterModelResult = parseSchema(openRouterModelSchema, process.env.OPENROUTER_MODEL);

    if (!openRouterModelResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: openRouterModelResult.issues,
        });
    }

    const mcpServerUrlResult = parseSchema(mcpServerUrlSchema, process.env.MCP_SERVER_URL);

    if (!mcpServerUrlResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: mcpServerUrlResult.issues,
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

    const enableRegistrationResult = parseSchema(enableRegistrationSchema, process.env.ENABLE_REGISTRATION);

    if (!enableRegistrationResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: enableRegistrationResult.issues,
        });
    }

    const enableRegistration = enableRegistrationResult.data === 'true';

    const portResult = parseSchema(portSchema, process.env.PORT);

    if (!portResult.success) {
        throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
            issues: portResult.issues,
        });
    }

    return {
        port: portResult.data,
        accessTokenSecret: accessTokenSecretResult.data,
        refreshTokenSecret: refreshTokenSecretResult.data,
        mongoURI: mongoUriResult.data,
        mongoDBName: mongoDbNameResult.data,
        mongoUserCollectionName: mongoUserCollectionNameResult.data,
        mongoJobsCollectionName: mongoJobsCollectionNameResult.data,
        mongoMcpConversationsCollectionName: mongoMcpConversationsCollectionNameResult.data,
        openRouterApiKey: openRouterApiKeyResult.data,
        openRouterModel: openRouterModelResult.data,
        mcpServerUrl: mcpServerUrlResult.data,
        maxDbRetries: maxDbRetriesResult.data,
        dbRetryDelayMs: dbRetryDelayMsResult.data,
        enableLogging,
        enableHttpRateLimit,
        enableRegistration,
    };
};
