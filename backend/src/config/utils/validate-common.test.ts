import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SchemaValidationException } from 'aop/exceptions';

import { validateCommonEnvironmentVariables } from './validate-common';

describe('validateCommonEnvironmentVariables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.ENABLE_REGISTRATION = 'true';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('when all common variables are valid', () => {
        it('should return correct common config object', () => {
            const accessTokenSecretValue = 'access-secret-key';
            const refreshTokenSecretValue = 'refresh-secret-key';
            const mongoUriValue = 'mongodb://localhost:27017';
            const mongoDbNameValue = 'testdb';
            const mongoUserCollectionNameValue = 'test-user-collection';
            const mongoJobsCollectionNameValue = 'test-jobs-collection';
            const mongoMcpConversationsCollectionNameValue = 'test-mcp-conversations-collection';
            const openRouterApiKeyValue = 'test-openrouter-key';
            const openRouterModelValue = 'test-openrouter-model';
            const mcpServerUrlValue = 'http://mcp-server:3000/mcp';
            const enableHttpRateLimitValue = 'false';
            const enableLoggingValue = 'true';
            const enableRegistrationValue = 'true';

            process.env.ACCESS_TOKEN_SECRET = accessTokenSecretValue;
            process.env.REFRESH_TOKEN_SECRET = refreshTokenSecretValue;
            process.env.MONGO_URI = mongoUriValue;
            process.env.MONGO_DB_NAME = mongoDbNameValue;
            process.env.MONGO_USER_COLLECTION_NAME = mongoUserCollectionNameValue;
            process.env.MONGO_JOBS_COLLECTION_NAME = mongoJobsCollectionNameValue;
            process.env.MONGO_MCP_CONVERSATIONS_COLLECTION_NAME = mongoMcpConversationsCollectionNameValue;
            process.env.OPENROUTER_API_KEY = openRouterApiKeyValue;
            process.env.OPENROUTER_MODEL = openRouterModelValue;
            process.env.MCP_SERVER_URL = mcpServerUrlValue;
            process.env.ENABLE_HTTP_RATE_LIMIT = enableHttpRateLimitValue;
            process.env.ENABLE_LOGGING = enableLoggingValue;
            process.env.ENABLE_REGISTRATION = enableRegistrationValue;

            const result = validateCommonEnvironmentVariables();

            expect(result).toEqual({
                port: 1000,
                accessTokenSecret: accessTokenSecretValue,
                refreshTokenSecret: refreshTokenSecretValue,
                mongoURI: mongoUriValue,
                mongoDBName: mongoDbNameValue,
                mongoUserCollectionName: mongoUserCollectionNameValue,
                mongoJobsCollectionName: mongoJobsCollectionNameValue,
                mongoMcpConversationsCollectionName: mongoMcpConversationsCollectionNameValue,
                openRouterApiKey: openRouterApiKeyValue,
                openRouterModel: openRouterModelValue,
                mcpServerUrl: mcpServerUrlValue,
                maxDbRetries: 3,
                dbRetryDelayMs: 5000,
                enableHttpRateLimit: false,
                enableLogging: true,
                enableRegistration: true,
            });
        });
    });

    describe('when common variables are invalid', () => {
        it('should throw SchemaValidationException for missing ACCESS_TOKEN_SECRET', () => {
            delete process.env.ACCESS_TOKEN_SECRET;

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for empty ACCESS_TOKEN_SECRET', () => {
            process.env.ACCESS_TOKEN_SECRET = '';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for missing REFRESH_TOKEN_SECRET', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            delete process.env.REFRESH_TOKEN_SECRET;

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for empty REFRESH_TOKEN_SECRET', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            process.env.REFRESH_TOKEN_SECRET = '';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for missing MONGO_URI', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            process.env.REFRESH_TOKEN_SECRET = 'valid-secret';
            delete process.env.MONGO_URI;

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for invalid MONGO_URI', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            process.env.REFRESH_TOKEN_SECRET = 'valid-secret';
            process.env.MONGO_URI = 'not-a-url';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for missing MONGO_DB_NAME', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            process.env.REFRESH_TOKEN_SECRET = 'valid-secret';
            process.env.MONGO_URI = 'mongodb://localhost:27017';
            delete process.env.MONGO_DB_NAME;

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for empty MONGO_DB_NAME', () => {
            process.env.ACCESS_TOKEN_SECRET = 'valid-secret';
            process.env.REFRESH_TOKEN_SECRET = 'valid-secret';
            process.env.MONGO_URI = 'mongodb://localhost:27017';
            process.env.MONGO_DB_NAME = '';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for invalid ENABLE_REGISTRATION', () => {
            process.env.ENABLE_REGISTRATION = 'yes';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for missing OPENROUTER_API_KEY', () => {
            delete process.env.OPENROUTER_API_KEY;

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });

        it('should throw SchemaValidationException for invalid MCP_SERVER_URL', () => {
            process.env.MCP_SERVER_URL = 'not-a-url';

            expect(() => validateCommonEnvironmentVariables()).toThrow(SchemaValidationException);
        });
    });
});
