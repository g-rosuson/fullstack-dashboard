import { ErrorCode } from '../../shared/enums';
import { ExceptionContext } from '../../shared/types';
import { HttpStatusCode } from 'shared/enums/http-status-codes';

import { BaseException } from '../base';

/**
 * Exception thrown when an upstream service fails.
 * Used for MCP server and model-provider failures that the caller maps to a prompt error.
 */
export class ExternalServiceException extends BaseException {
    /**
     * @param message Human-readable error message
     * @param context Additional context information
     */
    constructor(message: string, context: ExceptionContext = {}) {
        super(message, HttpStatusCode.BAD_GATEWAY, ErrorCode.EXTERNAL_SERVICE_ERROR, context);
    }
}
