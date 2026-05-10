# Authentication flows — business requirements

**Scope:** HTTP authentication for this product: registration, login, session refresh, and logout. These rules are the **contract** between the backend API and any client (web app, mobile, integration tests). Implementation details live in the codebase; this document states **observable behavior** and stable requirement IDs for traceability (e.g. tying tests to rules).

**Canonical routes** (see `backend/src/shared/constants/routes/index.ts`):

| Operation    | Method + path                    |
|-------------|-----------------------------------|
| Register    | `POST /api/auth/register`       |
| Login       | `POST /api/auth/login`          |
| Logout      | `POST /api/auth/logout`         |
| Refresh     | `GET /api/auth/refresh`          |

**JSON envelope (typical):** Successful responses use `success: true`, optional `data`, and `meta` (e.g. timestamp). Errors use `success: false` and an error `code` consistent with the API’s error taxonomy.

---

## Session model (access vs refresh)

| ID            | Business rule |
|---------------|----------------|
| **AUTH-TOK-001** | After **successful** registration or login, the API returns a **short-lived access token** as a **JWT string** in the response body field **`data`**. The client sends it to protected APIs (e.g. `Authorization: Bearer <accessToken>`). |
| **AUTH-TOK-002** | The **refresh token** MUST NOT appear in JSON. It is issued only via the **`Set-Cookie`** header, using the cookie name **`refreshToken`** (see `backend/src/shared/constants/http`). |
| **AUTH-TOK-003** | The refresh cookie MUST be **`HttpOnly`**, **`SameSite=Strict`**, and scoped with **`Path=/`**. In **production**, the cookie MUST be **`Secure`**. In **development**, `Secure` is omitted so local HTTP dev works. |

**Client obligation:** For any request that should carry cookies (login, register, logout, refresh), the browser or HTTP client MUST send **`credentials: 'include'`** (or equivalent) so `Set-Cookie` and `Cookie` behave correctly.

---

## Registration (`POST /api/auth/register`)

| ID               | Business rule |
|------------------|----------------|
| **AUTH-REG-001** | Given a valid registration payload, the API creates the user, responds **200**, **`success: true`**, returns an access token in **`data`** satisfying **AUTH-TOK-001**, and sets the refresh cookie satisfying **AUTH-TOK-002** and **AUTH-TOK-003**. |
| **AUTH-REG-002** | Registering the same **email** twice MUST fail with **409**, **`success: false`**, and error code **`CONFLICT_ERROR`**. |
| **AUTH-REG-010** | If the body fails validation (invalid email, missing email, password not meeting policy, missing password, invalid or missing confirmation password, missing first name, or missing last name), the API responds **400**, **`success: false`**, **`VALIDATION_ERROR`**. |

Password policy (complexity, confirmation match) is defined by the server’s registration schema; clients SHOULD mirror those rules in UX to reduce failed submits.

---

## Login (`POST /api/auth/login`)

| ID               | Business rule |
|------------------|----------------|
| **AUTH-LOG-001** | Given an existing user and correct credentials, the API responds **200**, **`success: true`**, returns a valid access token in **`data`**, and sets the refresh cookie per **AUTH-TOK-002** and **AUTH-TOK-003**. |
| **AUTH-LOG-002** | Wrong password, wrong email, or unknown user MUST be rejected with **404**, **`success: false`** (no successful session established). *Note: HTTP status mirrors current API behavior; changing to 401 would be a separate, explicit requirement change.* |

---

## Logout (`POST /api/auth/logout`)

| ID               | Business rule |
|------------------|----------------|
| **AUTH-OUT-001** | Without a **`refreshToken`** cookie on the request, logout MUST fail with **401** and **`success: false`**. |
| **AUTH-OUT-002** | With a valid session cookie present, logout responds **200**, **`success: true`**, and the response MUST include **`Set-Cookie`** that clears **`refreshToken`** (expired or zero max-age) so the client drops the cookie. |
| **AUTH-OUT-003** | After successful logout, a subsequent **refresh** without manually re-adding an old cookie MUST NOT succeed (session ended from the client’s perspective); refresh without a usable cookie MUST yield **401**. |

---

## Refresh (`GET /api/auth/refresh`)

| ID               | Business rule |
|------------------|----------------|
| **AUTH-REF-001** | With a **valid** refresh cookie, the API responds **200**, **`success: true`**, and **`data`** containing a **new** valid access token (re-issued; not necessarily byte-identical to the previous access token depending on timing). |
| **AUTH-REF-002** | Without a **`refreshToken`** cookie, the API responds **401**, **`success: false`**. |
| **AUTH-REF-003** | If the cookie value is not a verifiable refresh JWT (e.g. malformed string, or an access token used in the refresh cookie), the API responds **401**, **`success: false`**. |

Refresh MUST use only the **refresh** signing secret; an access token MUST NOT be accepted as a refresh token.

---

## Traceability (backend integration tests)

Primary verification: `backend/test/integration/auth/auth-http-integration.test.ts`. Each `it(...)` title is prefixed with bracketed requirement IDs (e.g. `[AUTH-REG-001][AUTH-TOK-001] ...`) so you can grep by ID.

| ID | Verified by |
|----|-------------|
| **AUTH-REG-001**, **AUTH-TOK-001**, **AUTH-TOK-002**, **AUTH-TOK-003** | Title starts with `[AUTH-REG-001][AUTH-TOK-001][AUTH-TOK-002][AUTH-TOK-003]` — successful registration |
| **AUTH-REG-002** | `[AUTH-REG-002]` — duplicate email |
| **AUTH-REG-010** | `[AUTH-REG-010]` — eight validation scenarios |
| **AUTH-LOG-001**, **AUTH-TOK-001**, **AUTH-TOK-002**, **AUTH-TOK-003** | Title starts with `[AUTH-LOG-001][AUTH-TOK-001]...` — successful login |
| **AUTH-LOG-002** | `[AUTH-LOG-002]` — wrong password, wrong email, unknown user |
| **AUTH-OUT-001** | `[AUTH-OUT-001]` |
| **AUTH-OUT-002** | `[AUTH-OUT-002]` |
| **AUTH-OUT-003** | `[AUTH-OUT-003]` (under logout) |
| **AUTH-REF-001**, **AUTH-TOK-001** | `[AUTH-REF-001][AUTH-TOK-001]` — successful refresh |
| **AUTH-REF-002** | `[AUTH-REF-002]` |
| **AUTH-REF-003** | `[AUTH-REF-003]` — invalid JWT and access token in cookie (two tests) |

When adding or changing a rule, assign a new ID (or bump the doc) and add or adjust a test; keep this table in sync.

---

## Change control

- **Backend-only changes** (e.g. refactoring) that preserve observable behavior need no ID change.
- **Contract changes** (status codes, cookie name, where tokens live, new endpoints) MUST update this document and downstream clients.
