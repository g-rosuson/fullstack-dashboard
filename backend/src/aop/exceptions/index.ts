/**
 * Central export point for all exception classes and types.
 * This file provides a clean API for importing exceptions throughout the application.
 */

// Validation exceptions
export { InputValidationException, SchemaValidationException } from './errors/validation';

// Authentication and authorization exceptions
export { ForbiddenException, TokenException, UnauthorizedException } from './errors/authentication';

// Resource-related exceptions
export { BusinessLogicException, ConflictException, ResourceNotFoundException } from './errors/resource';

// Database exceptions
export { DatabaseException } from './errors/database';

// System exceptions
export { InternalException } from './errors/system';

// Upstream service exceptions
export { ExternalServiceException } from './errors/external';

// Base exception
export { BaseException } from './errors/base';

// Exception middleware
export { exceptionsMiddleware } from './middleware';
