import { NextFunction, Request, Response } from 'express';

import { validateRequestPayload } from 'aop/http/validators/validators-request-payload';

import { CREATE_JOB_ROUTE } from './constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import { createJobInputSchema, idRouteParamSchema, paginatedRouteParamSchema, updateJobInputSchema } from './schemas';
import { validateToolsSchema } from './validators/jobs-validators';

/**
 * Validates that the request body adhears to the corresponding schema.
 * @param req Express request object with typed body
 * @param _res Express response object
 * @param next Express next function
 */
const validatePayload = (req: Request, _res: Response, next: NextFunction) => {
    // Validate the payload against the schema
    const schema = req.path === CREATE_JOB_ROUTE ? createJobInputSchema : updateJobInputSchema;

    const validatedPayload = validateRequestPayload(schema, req.body, ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED);

    validateToolsSchema(validatedPayload);

    req.body = validatedPayload;

    next();
};

/**
 * Validates that the request id query params adhears to the corresponding schema.
 * @param req Express request object with typed query params
 * @param _res Express response object
 * @param next Express next function
 */
const validateIdQueryParams = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        idRouteParamSchema,
        req.params,
        ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED
    );

    req.params = validatedPayload;

    next();
};

/**
 * Validates that the request pagination query params adhears to the corresponding schema.
 * @param req Express request object with typed query params
 * @param _res Express response object
 * @param next Express next function
 */
const validatePaginationQueryParams = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        paginatedRouteParamSchema,
        req.query,
        ErrorMessage.JOBS_SCHEMA_VALIDATION_FAILED
    );

    // Merge validated query params into req.query without overwriting the read-only property
    Object.assign(req.query, validatedPayload);

    next();
};

export { validatePayload, validateIdQueryParams, validatePaginationQueryParams };
