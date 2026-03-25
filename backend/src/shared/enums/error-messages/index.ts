/* eslint-disable no-unused-vars */
/**
 * Error messages used by exceptions in the application.
 */
export enum ErrorMessage {
    USER_NOT_FOUND = 'User not found',
    USER_ALREADY_EXISTS = 'User already exists',
    USER_PASSWORD_WRONG = 'Wrong credentials',
    TOKEN_INVALID = 'Parsed token schema is invalid',
    REFRESH_TOKEN_COOKIE_NOT_FOUND = 'Refresh token cookie not found',
    AUTHENTICATION_SCHEMA_VALIDATION_FAILED = 'Authentication schema validation failed',
    AUTHENTICATION_HEADER_INVALID = 'Authorization header is invalid',
    INVALID_REQUEST_BODY = 'Invalid request body. Expected a JSON object but got: ',
    HTML_TAGS_DETECTED = 'Invalid request body. HTML tags detected',
    SCHEMA_VALIDATION_FAILED = 'Schema validation failed',
    CONFLICT_ERROR = 'Database conflict error',
    DATABASE_ERROR = 'Database error',
    TOKEN_ERROR = 'Token error',
    UNEXPECTED_ERROR = 'Unexpected error',
    JOBS_SCHEMA_VALIDATION_FAILED = 'Job schema validation failed',
    JOBS_NOT_FOUND_IN_DATABASE = 'Jobs not found in database',
    JOBS_NOT_FOUND_IN_MEMORY = 'Job not found in memory',
    JOBS_START_DATE_IN_FUTURE = 'Start date must be in the future',
    JOBS_START_DATE_COME_BEFORE_END_DATE = 'Start date must come before end date',
    JOBS_ONCE_TYPE_CANNOT_HAVE_END_DATE = 'Jobs schedule type "once" cannot have an end date',
    JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING = 'Cannot update a job while it is running',
    JOBS_FAILED_TO_ADD_EXECUTION = 'Failed to add execution to job',
    DATABASE_OPERATION_FAILED_ERROR = 'Database operation failed',
    MONGO_CLIENT_MANAGER_INSTANCE_NOT_FOUND = 'Options are required to create a new MongoClientManager instance',
    MONGO_CLIENT_NOT_CONNECTED = 'MongoClient is not connected',
    DELEGATOR_JOB_NOT_FOUND_IN_MEMORY = 'Delegator job not found in memory',
    DELEGATOR_COULD_NOT_FIND_SCHEDULED_JOB = 'Delegator could not find scheduled job',
    UNHANDLED_TOOL_TYPE = 'Unhandled tool type',
}

/**
 * Error messages for environment variable validation.
 */
export enum EnvErrorMessage {
    ACCESS_TOKEN_SECRET_REQUIRED = 'ACCESS_TOKEN_SECRET is required',
    REFRESH_TOKEN_SECRET_REQUIRED = 'REFRESH_TOKEN_SECRET is required',
    MONGO_URI_INVALID = 'MONGO_URI must be a valid URL',
    MONGO_DB_NAME_REQUIRED = 'MONGO_DB_NAME is required',
    BASE_ROUTE_PATH_REQUIRED = 'BASE_ROUTE_PATH is required',
    NODE_ENV_REQUIRED = 'NODE_ENV must be either "development" or "production"',
    DEV_CLIENT_URL_REQUIRED = 'DEV_CLIENT_URL must be a valid URL',
    DEV_DOMAIN_REQUIRED = 'DEV_DOMAIN is required',
    PROD_CLIENT_URL_REQUIRED = 'PROD_CLIENT_URL must be a valid URL',
    PROD_DOMAIN_REQUIRED = 'PROD_DOMAIN is required',
    MAX_DB_RETRIES_INVALID = 'MAX_DB_RETRIES must be a positive integer',
    DB_RETRY_DELAY_MS_INVALID = 'DB_RETRY_DELAY_MS must be a positive integer',
    MONGO_USER_COLLECTION_NAME_REQUIRED = 'MONGO_USER_COLLECTION_NAME is required',
    MONGO_JOBS_COLLECTION_NAME_REQUIRED = 'MONGO_JOBS_COLLECTION_NAME is required',
}
