import jwt from 'jsonwebtoken';

import config from 'config';
import constants from 'shared/constants';

import type { Express } from 'express';

import { clearCollections, deleteCronJobs, disconnectMongo, getAgent, initServer } from '../harness';

/**
 * Mock data for testing.
 * @note Password satisfies the production register schema (length, cases, digit, symbol).
 */
const mockEmail = 'email@example.com';
const mockPassword = 'SecureP@ss1';

const mockRegisterPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: mockEmail,
    password: mockPassword,
    confirmationPassword: mockPassword,
};

/**
 * Asserts that the access token is valid and contains the expected email.
 */
function expectValidAccessToken(token: string, email: string): void {
    const payload = jwt.verify(token, config.accessTokenSecret);

    expect(payload).toEqual(
        expect.objectContaining({
            email,
            iat: expect.any(Number),
            exp: expect.any(Number),
        })
    );
}

/**
 * Wire contract: refresh token is Set-Cookie only, matching auth cookie options (httpOnly, sameSite, path, secure).
 *
 * @param setCookieHeader The Set-Cookie header from the response
 */
function expectRefreshTokenCookieContract(setCookieHeader: string | string[] | undefined): void {
    const lines = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
    const name = constants.http.cookies.refreshToken;
    const refreshLine = lines.find(line => line.startsWith(`${name}=`));

    expect(refreshLine).toBeDefined();
    const lower = refreshLine!.toLowerCase();
    expect(lower).toContain('httponly');
    expect(refreshLine).toMatch(/samesite=strict/i);
    expect(refreshLine).toMatch(/path=\//i);

    if (config.isDeveloping) {
        expect(lower).not.toContain('secure');
    } else {
        expect(lower).toContain('secure');
    }
}

/**
 * Logout should instruct the client to drop the refresh cookie (expired / empty value).
 *
 * @param setCookieHeader The Set-Cookie header from the response
 */
function expectRefreshTokenClearCookie(setCookieHeader: string | string[] | undefined): void {
    const lines = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
    const name = constants.http.cookies.refreshToken;
    const clearLine = lines.find(line => line.startsWith(`${name}=`));

    expect(clearLine).toBeDefined();
    expect(clearLine).toMatch(/expires=thu,\s*01\s+jan\s+1970|expires=wed,\s*31\s+dec\s+1969|max-age=0/i);
}

/**
 * Integration: auth routes against real Mongo + bcrypt + cookies + JWT verification.
 * Asserts HTTP contracts (status, JSON envelope), not internal handlers.
 *
 * Requirement IDs: docs/requirements/authentication-flows.md
 */
describe('Integration: auth HTTP', () => {
    let app: Express;
    let agent: ReturnType<typeof getAgent>;

    beforeAll(async () => {
        app = await initServer();
        agent = getAgent(app);
    });

    beforeEach(async () => {
        await deleteCronJobs();
        await clearCollections();
    });

    afterAll(async () => {
        await deleteCronJobs();
        await clearCollections();
        await disconnectMongo();
    });

    describe(`POST ${constants.routes.auth.register}`, () => {
        it('[AUTH-REG-001][AUTH-TOK-001][AUTH-TOK-002][AUTH-TOK-003] returns a valid access token and sets a refresh cookie on successful registration', async () => {
            const res = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expectValidAccessToken(res.body.data, mockEmail);
            expectRefreshTokenCookieContract(res.headers['set-cookie']);
        });

        it('[AUTH-REG-002] returns conflict when the email is already registered', async () => {
            const first = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);

            expect(first.status).toBe(200);

            const second = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);

            expect(second.status).toBe(409);
            expect(second.body.success).toBe(false);
            expect(second.body.code).toBe('CONFLICT_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when the email is not valid', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                email: 'invalid-email',
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when there is no email', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                email: undefined,
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when the password is not valid', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                password: 'short',
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when there is no password', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                password: undefined,
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when the confirmation password is not valid', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                confirmationPassword: 'short',
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when there is no confirmation password', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                confirmationPassword: undefined,
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when the first name is not valid', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                firstName: undefined,
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });

        it('[AUTH-REG-010] returns a validation error when the last name is not valid', async () => {
            const res = await agent.post(constants.routes.auth.register).send({
                ...mockRegisterPayload,
                lastName: undefined,
            });
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe('VALIDATION_ERROR');
        });
    });

    describe(`POST ${constants.routes.auth.login}`, () => {
        it('[AUTH-LOG-001][AUTH-TOK-001][AUTH-TOK-002][AUTH-TOK-003] returns a valid access token and sets a refresh cookie on successful login', async () => {
            await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const res = await agent.post(constants.routes.auth.login).send({
                email: mockEmail,
                password: mockPassword,
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expectValidAccessToken(res.body.data, mockEmail);
            expectRefreshTokenCookieContract(res.headers['set-cookie']);
        });

        it('[AUTH-LOG-002] fails when the password is wrong', async () => {
            await agent.post(constants.routes.auth.register).send(mockRegisterPayload);

            const res = await agent.post(constants.routes.auth.login).send({
                email: mockEmail,
                password: `${mockPassword}X`,
            });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it('[AUTH-LOG-002] fails when the email is wrong', async () => {
            await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const res = await agent.post(constants.routes.auth.login).send({
                email: `x${mockEmail}`,
                password: mockPassword,
            });
            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it('[AUTH-LOG-002] fails when the user does not exist', async () => {
            const res = await agent.post(constants.routes.auth.login).send({
                email: mockEmail,
                password: mockPassword,
            });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe(`POST ${constants.routes.auth.logout}`, () => {
        it('[AUTH-OUT-001] rejects logout without the refresh cookie', async () => {
            const res = await agent.post(constants.routes.auth.logout);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('[AUTH-OUT-002] returns a success response on successful logout', async () => {
            const registerResponse = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const setCookie = registerResponse.headers['set-cookie'];
            const logoutResponse = await agent.post(constants.routes.auth.logout).set('Cookie', setCookie);
            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);
            expectRefreshTokenClearCookie(logoutResponse.headers['set-cookie']);
        });

        it('[AUTH-OUT-003] clears the session contract by rejecting refresh after logout', async () => {
            const registerResponse = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const setCookie = registerResponse.headers['set-cookie'];

            const logoutResponse = await agent.post(constants.routes.auth.logout).set('Cookie', setCookie);
            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.success).toBe(true);

            const afterLogout = await agent.get(constants.routes.auth.refresh);
            expect(afterLogout.status).toBe(401);
            expect(afterLogout.body.success).toBe(false);
        });
    });

    describe(`GET ${constants.routes.auth.refresh}`, () => {
        it('[AUTH-REF-001][AUTH-TOK-001] issues a new access token when the refresh cookie is valid', async () => {
            const registerResponse = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const setCookie = registerResponse.headers['set-cookie'];
            const firstAccess = registerResponse.body.data;

            // JWT `iat` is second-resolution; refresh in the same second can mint an identical access string.
            await new Promise<void>(resolve => {
                setTimeout(resolve, 1100);
            });

            const refreshResponse = await agent.get(constants.routes.auth.refresh).set('Cookie', setCookie);

            expect(refreshResponse.status).toBe(200);
            expect(refreshResponse.body.success).toBe(true);
            expectValidAccessToken(refreshResponse.body.data, mockEmail);
            expect(refreshResponse.body.data).not.toBe(firstAccess);
        });

        it('[AUTH-REF-002] rejects refresh without the cookie', async () => {
            const refreshResponse = await agent.get(constants.routes.auth.refresh);
            expect(refreshResponse.status).toBe(401);
            expect(refreshResponse.body.success).toBe(false);
        });

        it('[AUTH-REF-003] rejects refresh when the cookie is not a valid JWT', async () => {
            const cookieName = constants.http.cookies.refreshToken;
            const res = await agent.get(constants.routes.auth.refresh).set('Cookie', `${cookieName}=not-a-jwt`);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('[AUTH-REF-003] rejects refresh when the cookie holds an access token', async () => {
            const registerResponse = await agent.post(constants.routes.auth.register).send(mockRegisterPayload);
            const accessToken = registerResponse.body.data as string;
            const cookieName = constants.http.cookies.refreshToken;

            const res = await agent.get(constants.routes.auth.refresh).set('Cookie', `${cookieName}=${accessToken}`);

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
