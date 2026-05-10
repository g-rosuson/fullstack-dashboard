import { ValidationIssue } from 'lib/validation/types';

import { ExceptionContext } from '../../shared/types';

/**
 * Type definitions for the error handling middleware.
 * These types define the structure and contracts for error responses.
 */

/**
 * Standard error response structure sent to clients.
 */
export interface ErrorResponse {
    success: false;
    code: string;
    timestamp: string;
    issues?: ValidationIssue[];
}

/**
 * Error logging context for structured logging.
 */
export interface ErrorLogContext {
    method: string;
    message: string;
    url: string;
    userAgent?: string;
    statusCode: number;
    errorType: string;
    ip?: string;
    userId?: string;
    stack?: string;
    context?: ExceptionContext;
}
