import { z } from 'zod';

import { EnvErrorMessage } from 'shared/enums/error-messages';

// Environment variable schemas
const nodeEnvSchema = z.enum(['development', 'production'], {
    errorMap: () => ({ message: EnvErrorMessage.NODE_ENV_REQUIRED }),
});

const devClientUrlSchema = z.string().url(EnvErrorMessage.DEV_CLIENT_URL_REQUIRED);

const prodClientUrlSchema = z.string().url(EnvErrorMessage.PROD_CLIENT_URL_REQUIRED);

const devDomainSchema = z.string().min(1, EnvErrorMessage.DEV_DOMAIN_REQUIRED);

const prodDomainSchema = z.string().min(1, EnvErrorMessage.PROD_DOMAIN_REQUIRED);

const accessTokenSecretSchema = z.string().min(1, EnvErrorMessage.ACCESS_TOKEN_SECRET_REQUIRED);

const refreshTokenSecretSchema = z.string().min(1, EnvErrorMessage.REFRESH_TOKEN_SECRET_REQUIRED);

const mongoUriSchema = z.string().url(EnvErrorMessage.MONGO_URI_INVALID);

const mongoDbNameSchema = z.string().min(1, EnvErrorMessage.MONGO_DB_NAME_REQUIRED);

const maxDbRetriesSchema = z.coerce.number().int().positive(EnvErrorMessage.MAX_DB_RETRIES_INVALID).default(3);

const dbRetryDelayMsSchema = z.coerce.number().int().positive(EnvErrorMessage.DB_RETRY_DELAY_MS_INVALID).default(5000);

const mongoUserCollectionNameSchema = z.string().min(1, EnvErrorMessage.MONGO_USER_COLLECTION_NAME_REQUIRED);

const mongoJobsCollectionNameSchema = z.string().min(1, EnvErrorMessage.MONGO_JOBS_COLLECTION_NAME_REQUIRED);

const mongoMcpConversationsCollectionNameSchema = z
    .string()
    .min(1, EnvErrorMessage.MONGO_MCP_CONVERSATIONS_COLLECTION_NAME_REQUIRED);

const openRouterApiKeySchema = z.string().min(1, EnvErrorMessage.OPENROUTER_API_KEY_REQUIRED);

const openRouterModelSchema = z.string().min(1, EnvErrorMessage.OPENROUTER_MODEL_REQUIRED);

const mcpServerUrlSchema = z.string().url(EnvErrorMessage.MCP_SERVER_URL_INVALID);

const enableHttpRateLimitSchema = z.enum(['true', 'false'], {
    errorMap: () => ({ message: EnvErrorMessage.DISABLE_HTTP_RATE_LIMIT_INVALID }),
});

const enableLoggingSchema = z.enum(['true', 'false'], {
    errorMap: () => ({ message: EnvErrorMessage.DISABLE_LOGGING_INVALID }),
});

const enableRegistrationSchema = z.enum(['true', 'false'], {
    errorMap: () => ({ message: EnvErrorMessage.ENABLE_REGISTRATION_INVALID }),
});

const portSchema = z.coerce.number().int().min(1).max(65535).default(1000);

export {
    nodeEnvSchema,
    devClientUrlSchema,
    prodClientUrlSchema,
    devDomainSchema,
    prodDomainSchema,
    accessTokenSecretSchema,
    refreshTokenSecretSchema,
    mongoUriSchema,
    mongoDbNameSchema,
    maxDbRetriesSchema,
    dbRetryDelayMsSchema,
    mongoUserCollectionNameSchema,
    mongoJobsCollectionNameSchema,
    mongoMcpConversationsCollectionNameSchema,
    openRouterApiKeySchema,
    openRouterModelSchema,
    mcpServerUrlSchema,
    enableHttpRateLimitSchema,
    enableLoggingSchema,
    enableRegistrationSchema,
    portSchema,
};
