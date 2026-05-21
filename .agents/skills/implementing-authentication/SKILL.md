---
name: implementing-authentication
description: Implement the full JWT authentication flow for this repository — register, login, logout, and token refresh. Covers bcrypt hashing, access token issuance, httpOnly refresh cookie, Zod payload validation, and the frontend token lifecycle (decode → Zustand store → expiry redirect). Use when adding or modifying any auth endpoint or the frontend session bootstrap.
---

# Purpose

Guide complete, end-to-end implementation of authentication across the Express backend and React frontend following established repository conventions.

# When To Use

- Adding or modifying `register`, `login`, `logout`, or `refresh` endpoints.
- Changing how access tokens or refresh cookies are issued or consumed.
- Implementing the frontend `Authenticate` session-bootstrap component.
- Debugging token expiry, cookie issues, or JWT validation failures.

# Required Patterns

## Backend

- Passwords: `bcrypt.hash(password, 10)` before storage. Never log or return hashes.
- Access token: short-lived, returned in `res.json({ success: true, data: accessToken, meta: { timestamp: Date.now() } })`.
- Refresh token: `httpOnly` cookie only — never in response body.
- Cookie options: `httpOnly: true`, `secure: true` in production, `sameSite: 'strict'`. Use `utils.getRefreshCookieOptions()` from `modules/auth/utils`.
- JWT payload must match `JwtPayload` type from `shared/types/jwt`.
- After `jwt.verify()`, validate decoded payload with `parseSchema(jwtPayloadSchema, decoded)` from `lib/validation`.
- Throw typed exceptions (`UnauthorizedException`, `TokenException`) — never `res.status().json()` errors from controllers.

## Frontend

- Access token stored in Zustand only (`useStore` → `accessToken`). Never `localStorage`.
- After login/register, decode the returned token with `utils.jwt.decode()`, then validate shape with `jwtPayloadSchema.safeParse()`.
- On invalid payload, call `userSelectors.clearUser()` and redirect to `/login`.
- On valid payload, call `userSelectors.changeUser({ accessToken, ...parsedJwt.data })`.
- `credentials: 'include'` must be set on all API requests so the refresh cookie is sent automatically.
- Token refresh is handled inside the `Authenticate` layout component on mount.

# Implementation Steps

## Backend — register endpoint

1. Destructure `{ firstName, lastName, email, password }` from `req.body`.
2. `const hashedPassword = await bcrypt.hash(password, 10)`.
3. Insert via `req.context.db.repository.users.create(newUser)`.
4. Build `JwtPayload` from insert result.
5. `const { accessToken, refreshToken } = jwtService.createTokens(tokenPayload)`.
6. `res.cookie(constants.http.cookies.refreshToken, refreshToken, utils.getRefreshCookieOptions())`.
7. `res.status(HttpStatusCode.OK).json({ success: true, data: accessToken, meta: { timestamp: Date.now() } })`.

## Backend — login endpoint

1. `req.context.db.repository.users.getByEmail(email)` — throw `UnauthorizedException` if null.
2. `bcrypt.compare(password, userDocument.password)` — throw `UnauthorizedException` on mismatch.
3. Build `JwtPayload` from document.
4. Issue tokens, set cookie, respond as above.

## Backend — renewAccessToken endpoint

1. `const decoded = verify(req.cookies.refreshToken, config.refreshTokenSecret)`.
2. `const result = parseSchema(jwtPayloadSchema, decoded)` — throw `TokenException` on failure.
3. `const { accessToken } = jwtService.createTokens(result.data)`.
4. Respond `{ success: true, data: accessToken, meta: { timestamp: Date.now() } }`.

## Backend — routing wire-up

```
router.post(constants.routes.auth.login,   loginLimiter,   validateUserInput, validateAuthenticationInput, login);
router.post(constants.routes.auth.register, registerLimiter, validateUserInput, validateAuthenticationInput, register);
router.post(constants.routes.auth.logout,  validateRefreshToken, logout);
router.get(constants.routes.auth.refresh,  refreshLimiter,  validateRefreshToken, renewAccessToken);
```

## Frontend — auth form submission

```typescript
try {
    setState(prev => ({ ...prev, isLoading: true }));
    const response = await api.service.resources.authentication.login(payload);
    const decoded = utils.jwt.decode(response.data);
    const parsed = jwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
        userSelectors.clearUser();
        navigate(config.routes.login);
        return;
    }
    userSelectors.changeUser({ accessToken: response.data, ...parsed.data });
} catch (error) {
    if (error instanceof CustomError) { /* surface error.issues */ }
    logging.error(error as Error);
} finally {
    setState(prev => ({ ...prev, isLoading: false }));
}
```

# Examples

## Correct response shape — login success

```typescript
res.status(HttpStatusCode.OK).json({
    success: true,
    data: accessToken,        // string — JWT
    meta: { timestamp: Date.now() },
});
```

## Correct cookie configuration

```typescript
// utils.getRefreshCookieOptions() returns:
{
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    // expiry derived from refresh token TTL
}
```

## Correct Zustand update after login

```typescript
userSelectors.changeUser({
    accessToken: response.data,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    id: parsed.data.id,
});
```

# Edge Cases

- **Duplicate email on register**: MongoDB index throws code `11000`. `exceptionsMiddleware` converts this to `ConflictException` automatically — do not catch manually.
- **Expired refresh token**: `jwt.verify()` throws; `validateRefreshToken` middleware catches it as `TokenException`.
- **Malformed JWT payload**: `parseSchema` returns `{ success: false }` — throw `TokenException` or redirect frontend to login.
- **Logout cookie clearing**: Call `res.clearCookie(constants.http.cookies.refreshToken, utils.getRefreshCookieOptions(false))` — `false` omits the expiry so the browser removes the cookie.

# Anti-Patterns

- **Never** store refresh tokens in the response body.
- **Never** store access tokens in `localStorage` or `sessionStorage`.
- **Never** use `jwt.decode()` alone for authorization — always `jwt.verify()` first.
- **Never** skip `parseSchema` after `jwt.verify()` — the payload shape is not guaranteed.
- **Never** manually catch MongoDB `11000` in auth controllers.
- **Never** log passwords, tokens, or hashes at any log level.
- **Never** hardcode route strings — use `constants.routes.auth.*`.
- **Never** remove `loginLimiter`, `registerLimiter`, or `refreshLimiter` from auth routes.

# Validation Checklist

- [ ] Password hashed with `bcrypt` (cost 10) before insertion
- [ ] Access token returned in JSON body; refresh token only in httpOnly cookie
- [ ] `utils.getRefreshCookieOptions()` used for cookie settings
- [ ] JWT payload validated with `parseSchema(jwtPayloadSchema, decoded)` after `verify()`
- [ ] Typed exceptions thrown — no manual `res.status().json()` error responses
- [ ] Rate limiters present on all auth routes
- [ ] Frontend clears store and redirects on malformed JWT payload
- [ ] `credentials: 'include'` set on all fetch calls
- [ ] No tokens or secrets committed to version control
