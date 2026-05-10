import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SchemaValidationException } from 'aop/exceptions';

import { validateCommonEnvironmentVariables } from './validate-common';

describe('validateCommonEnvironmentVariables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
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
            const enableHttpRateLimitValue = 'false';
            const enableLoggingValue = 'true';

            process.env.ACCESS_TOKEN_SECRET = accessTokenSecretValue;
            process.env.REFRESH_TOKEN_SECRET = refreshTokenSecretValue;
            process.env.MONGO_URI = mongoUriValue;
            process.env.MONGO_DB_NAME = mongoDbNameValue;
            process.env.ENABLE_HTTP_RATE_LIMIT = enableHttpRateLimitValue;
            process.env.ENABLE_LOGGING = enableLoggingValue;

            const result = validateCommonEnvironmentVariables();

            expect(result).toEqual({
                accessTokenSecret: accessTokenSecretValue,
                refreshTokenSecret: refreshTokenSecretValue,
                mongoURI: mongoUriValue,
                mongoDBName: mongoDbNameValue,
                maxDbRetries: 3,
                dbRetryDelayMs: 5000,
                enableHttpRateLimit: false,
                enableLogging: true,
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
    });
});
