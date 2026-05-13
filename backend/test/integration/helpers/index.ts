import jwt from 'jsonwebtoken';

import localConstants from '../constants';
import config from 'config';
import constants from 'shared/constants';

import { getAgent } from '../harness';

/**
 * Normalizes `Set-Cookie` into separate cookie attribute strings for assertions.
 *
 * @param setCookieHeader - Raw header value from `supertest` (`string`, `string[]`, or absent)
 * @returns Individual `Set-Cookie` lines (may be empty when the header is missing)
 * @private
 */
function _parseSetCookieLines(setCookieHeader: string | string[] | undefined): string[] {
    return Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
}

/**
 * Builds a register-request body for integration tests.
 *
 * @param email - Email address for the new user
 * @returns Payload accepted by the auth register route validator
 */
export function buildRegisterPayload(email: string): {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmationPassword: string;
} {
    return {
        firstName: 'John',
        lastName: 'Doe',
        email,
        password: localConstants.integrationAuthPassword,
        confirmationPassword: localConstants.integrationAuthPassword,
    };
}

/**
 * Verifies an access JWT with the application access-token secret and asserts payload shape (`email`, `iat`, `exp`).
 *
 * @param token - Access token string from a JSON response body
 * @param email - Expected `email` claim after verification
 */
export function expectValidAccessToken(token: string, email: string): void {
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
 * Asserts the refresh-token `Set-Cookie` matches the wire contract (httpOnly, SameSite=Strict, Path=/, Secure when not developing).
 *
 * @param setCookieHeader - `Set-Cookie` header(s) from the HTTP response
 */
export function expectRefreshTokenCookieContract(setCookieHeader: string | string[] | undefined): void {
    const lines = _parseSetCookieLines(setCookieHeader);
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
 * Asserts logout returned a `Set-Cookie` that clears the refresh cookie (epoch expiry or `max-age=0`).
 *
 * @param setCookieHeader - `Set-Cookie` header(s) from the logout response
 */
export function expectRefreshTokenClearCookie(setCookieHeader: string | string[] | undefined): void {
    const lines = _parseSetCookieLines(setCookieHeader);
    const name = constants.http.cookies.refreshToken;
    const clearLine = lines.find(line => line.startsWith(`${name}=`));

    expect(clearLine).toBeDefined();
    expect(clearLine).toMatch(/expires=thu,\s*01\s+jan\s+1970|expires=wed,\s*31\s+dec\s+1969|max-age=0/i);
}

/**
 * Registers a user via the real `POST` register route.
 *
 * @param agent - Supertest agent from {@link getAgent}
 * @param email - Email to register (must be unique per test DB state)
 * @returns Response status and body (access token in `body.data` on success)
 */
export async function getRegisterResponse(
    agent: ReturnType<typeof getAgent>,
    email: string
): Promise<{ status: number; body: { data: string } }> {
    return await agent.post(constants.routes.auth.register).send(buildRegisterPayload(email));
}
