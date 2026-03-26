import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { verify } from 'jsonwebtoken';

import { TokenException, UnauthorizedException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import { REFRESH_TOKEN_COOKIE_NAME } from './constants';
import utils from './utils';
import config from 'config';

import { CreateUserPayload, RegisterUserInput } from './types';
import { LoginUserInput } from './types';
import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';
import { JwtPayload } from 'shared/types/jwt';

import jwtService from 'services/jwt';
import { jwtPayloadSchema } from 'shared/schemas/jwt';

/**
 * Attempts to create a new user document using atomic insertion.
 * On success, it responds with an JWT access-token and sets a httpOnly
 * refresh-token cookie.
 */
const register = async (req: Request<unknown, unknown, RegisterUserInput>, res: Response) => {
    const { firstName, lastName, email, password } = req.body;

    // Create a new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: CreateUserPayload = {
        firstName,
        lastName,
        password: hashedPassword,
        email,
    };

    // Note: Collection is indexed so duplicate emails will throw a duplicate key error
    const insertResponse = await req.context.db.repository.users.create(newUser);

    // Create JWT tokens
    const tokenPayload: JwtPayload = {
        firstName,
        lastName,
        email,
        id: insertResponse.insertedId.toString(),
    };

    const { accessToken, refreshToken } = jwtService.createTokens(tokenPayload);

    // Send a refresh-token to the client in a httpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, utils.getRefreshCookieOptions());

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: accessToken,
        meta: { timestamp: Date.now() },
    });
};

/**
 * Validates the login details and sends the user payload and a httpOnly refresh-token cookie to the browser.
 */
const login = async (req: Request<unknown, unknown, LoginUserInput>, res: Response) => {
    const { email, password } = req.body;

    // Get user by email
    const userDocument = await req.context.db.repository.users.getByEmail(email);

    // Validate if user exists
    if (!userDocument) {
        throw new UnauthorizedException(ErrorMessage.USER_NOT_FOUND);
    }

    // Validate if password is correct
    const isPasswordValid = await bcrypt.compare(password, userDocument.password);

    if (!isPasswordValid) {
        throw new UnauthorizedException(ErrorMessage.USER_PASSWORD_WRONG);
    }

    // Create JWT tokens
    const tokenPayload: JwtPayload = {
        firstName: userDocument.firstName,
        lastName: userDocument.lastName,
        email: userDocument.email,
        id: userDocument._id.toString(),
    };

    const { accessToken, refreshToken } = jwtService.createTokens(tokenPayload);

    // Set refresh token as a httpOnly cookie and send user data to front-end
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, utils.getRefreshCookieOptions());

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: accessToken,
        meta: { timestamp: Date.now() },
    });
};

/**
 * Clears the refresh-token cookie from the browser.
 */
const logout = async (_req: Request, res: Response) => {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, utils.getRefreshCookieOptions(false));

    res.status(HttpStatusCode.OK).json({
        success: true,
        meta: { timestamp: Date.now() },
    });
};

/**
 * Sends a new access-token to the browser when the refresh-token
 * contained in a httpOnly cookie is valid.
 */
const renewAccessToken = async (req: Request, res: Response) => {
    // Validate and decode the refresh-token
    // Note: When the JWT is invalid "verify" throws an error
    const decoded = verify(req.cookies.refreshToken, config.refreshTokenSecret);

    // Validate the refresh JWT structure
    const result = parseSchema(jwtPayloadSchema, decoded);

    if (!result.success) {
        throw new TokenException(ErrorMessage.TOKEN_INVALID);
    }

    // Create a new access-token and send it to the browser
    const { accessToken } = jwtService.createTokens(result.data);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: accessToken,
        meta: { timestamp: Date.now() },
    });
};

export { renewAccessToken, register, logout, login };
