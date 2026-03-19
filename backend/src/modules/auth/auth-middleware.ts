import { type NextFunction, type Request, type Response } from 'express';

import { TokenException } from 'aop/exceptions';
import { validateRequestPayload } from 'aop/http/validators/validators-request-payload';

import { REFRESH_TOKEN_COOKIE_NAME, REGISTER_ROUTE } from './constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import { registerUserInputSchema } from './schemas';
import { loginUserInputSchema } from './schemas';

/**
 * Validates that the request body adhears to the corresponding schema.
 */
const validateAuthenticationInput = (req: Request, _res: Response, next: NextFunction) => {
    // Determine schema based on the request path
    const isRegistering = req.path === REGISTER_ROUTE;
    const schema = isRegistering ? registerUserInputSchema : loginUserInputSchema;

    const validatedPayload = validateRequestPayload(
        schema,
        req.body,
        ErrorMessage.AUTHENTICATION_SCHEMA_VALIDATION_FAILED
    );

    req.body = validatedPayload;

    next();
};

/**
 * Validates that a refreshToken request cookie exists.
 */
const validateRefreshToken = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]) {
        throw new TokenException(ErrorMessage.REFRESH_TOKEN_COOKIE_NOT_FOUND);
    }

    next();
};

export { validateAuthenticationInput, validateRefreshToken };
