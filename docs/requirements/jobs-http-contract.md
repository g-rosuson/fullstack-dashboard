# Jobs HTTP contract — business requirements

**Scope:** Authenticated CRUD and streaming endpoints for **per-user jobs**. Rules describe **observable HTTP behavior** (status, JSON envelope, isolation). Stable requirement IDs tie scenarios to integration tests. Payload shapes and validators live in the backend; this document summarizes what callers can rely on.

**Canonical routes** (see `backend/src/shared/constants/routes/index.ts`):

| Operation        | Method + path                          |
|-----------------|----------------------------------------|
| List jobs       | `GET /api/jobs/get-all`               |
| Get job by id   | `GET /api/jobs/get/:id`               |
| Create job      | `POST /api/jobs/create`               |
| Update job      | `PUT /api/jobs/update/:id`            |
| Delete job      | `DELETE /api/jobs/delete/:id`         |
| Running-jobs SSE | `GET /api/jobs/stream-all`           |

**JSON envelope:** Successful responses use `success: true` and domain fields (`data`, and for list, pagination fields such as `limit`, `offset`, `count`). Errors use `success: false`, an error `code` from the API taxonomy, and validation failures may include an `issues` array with `property` / `message` entries.

**Authentication:** All jobs routes (except where explicitly tested otherwise) expect a valid access token: **`Authorization: Bearer <accessToken>`**. Registration and login behavior are specified in [auth-http-contract.md](./auth-http-contract.md).

---

## Authorization on jobs routes

| ID               | Business rule |
|------------------|----------------|
| **JOBS-AUTH-001** | A **`GET /api/jobs/get-all`** request **without** an `Authorization` header MUST fail with **400**, **`success: false`**, and **`VALIDATION_ERROR`**. |

---

## Listing (`GET /api/jobs/get-all`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-LST-001** | For an authenticated user with **no** jobs, the API responds **200**, **`success: true`**, **`data`** is an **empty array**, and pagination metadata includes **`limit`**, **`offset`**, and **`count`** all consistent with an empty result (the integration suite expects numeric zeros for list defaults). |
| **JOBS-LST-002** | **`limit`** and **`offset`** query parameters are honored: **200**, **`success: true`**, **`data`** length respects `limit`, **`limit`** / **`offset`** echo in the body, and **`count`** reflects how many jobs are returned in **`data`** for that response. Jobs returned across pages have **distinct** ids (no duplicates across pages in the scenario under test). |

---

## Owner isolation (cross-user access)

Jobs are **owned** by the user identified by the bearer token. Another user MUST NOT read, update, or delete a job they do not own; the API MUST respond as **not found** for that caller (no leakage that the id exists).

| ID               | Business rule |
|------------------|----------------|
| **JOBS-ISO-001** | User B requesting **`GET /api/jobs/get/:id`** for a job owned by user A MUST receive **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |
| **JOBS-ISO-002** | User B **`PUT /api/jobs/update/:id`** on user A’s job MUST yield **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |
| **JOBS-ISO-003** | User B **`DELETE /api/jobs/delete/:id`** on user A’s job MUST yield **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |

---

## Get by id (`GET /api/jobs/get/:id`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-GET-001** | For the **owner**, a **scheduled** job responds **200**, **`success: true`**, with **`data`** including **`id`**, **`name`**, a non-null **`schedule`** with expected **`type`**, and **enriched** schedule fields such as **`nextRun`** (string). |
| **JOBS-GET-002** | For a valid user, a **non-existent** job id MUST yield **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |

---

## Create (`POST /api/jobs/create`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-CRT-001** | Creating a job **without** a schedule (**`schedule: null`**) succeeds with **201**, **`success: true`**, **`data.name`** and **`data.id`** set, **`data.schedule`** **null**, tools persisted with stable identifiers (**e.g. `toolId`, nested `targetId`** where applicable). |
| **JOBS-CRT-002** | Creating a **scheduled** job succeeds with **201**, **`success: true`**, non-null **`schedule`** with expected **`type`**, **`startDate`**, string **`nextRun`**, and **`lastRun`** either **`null`** or an ISO string. |

### Schedule validation (create)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-SCH-001** | If **`startDate`** is **not** strictly in the **future**, the API responds **400**, **`success: false`**, **`VALIDATION_ERROR`**, with an issue on **`startDate`** (message **`JOBS_START_DATE_IN_FUTURE`** in the integration assertion). |
| **JOBS-SCH-002** | If **`endDate`** is **before** **`startDate`** (invalid range), the API responds **400**, **`VALIDATION_ERROR`**, with an issue on **`startDate`** (message **`JOBS_START_DATE_COME_BEFORE_END_DATE`**). |
| **JOBS-SCH-003** | For **`type: 'once'`**, an **`endDate`** MUST NOT be allowed: **400**, **`VALIDATION_ERROR`**, issue on **`endDate`** (message **`JOBS_ONCE_TYPE_CANNOT_HAVE_END_DATE`**). |

### Tool validation (create)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-TLR-001** | For a **scraper**, if **both** the tool and a target **omit keywords** (where at least one side must supply them), the API responds **400**, **`VALIDATION_ERROR`**, including an issue on **`keywords`**. |
| **JOBS-TLR-002** | For a **scraper**, if **both** the tool and a target **omit maxPages**, the API responds **400**, **`VALIDATION_ERROR`**, including an issue on **`maxPages`**. |
| **JOBS-TLR-003** | For **email** tools, **subject** and **body** must be present when missing at both tool and target level: **400**, **`VALIDATION_ERROR`**, with issues on **`subject`** or **`body`** respectively (two scenarios). |

---

## Update (`PUT /api/jobs/update/:id`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-UPD-001** | Owner may update fields (e.g. **`name`** via payload derived from current job); **200**, **`success: true`**, and a follow-up **GET** shows persisted changes. |
| **JOBS-UPD-002** | Owner may set **`schedule`** to **`null`** to clear scheduling; **200** and subsequent **GET** show **`schedule`** **null**. |
| **JOBS-UPD-003** | **`schedule: null`** combined with **`runJob: true`** is accepted (**200**); **`schedule`** remains **null** in the response data. |
| **JOBS-UPD-004** | While the job’s execution delegate is **running**, an update may be rejected with **422**, **`success: false`**, **`BUSINESS_LOGIC_ERROR`** (timing-sensitive; the integration test polls until this outcome or times out). |
| **JOBS-UPD-005** | **PUT** for a **non-existent** id MUST yield **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |

---

## Delete (`DELETE /api/jobs/delete/:id`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-DEL-001** | Owner deletes an existing job: **200**, **`success: true`**, **`data.id`** matches; follow-up **GET** returns **404**, **`NOT_FOUND_ERROR`**. |
| **JOBS-DEL-002** | **DELETE** for a **non-existent** id MUST yield **404**, **`success: false`**, **`NOT_FOUND_ERROR`**. |

---

## Server-Sent Events (`GET /api/jobs/stream-all`)

| ID               | Business rule |
|------------------|----------------|
| **JOBS-SSE-001** | With a valid bearer token, the connection succeeds (**HTTP 200**), **`Content-Type`** includes **`text/event-stream`**, and the stream eventually emits payload containing the **`running-jobs`** event name (see `backend/src/shared/constants/events/index.ts`, field **`jobs.runningJobs`**). |

---

## Traceability (backend integration tests)

Primary verification: **`backend/test/integration/jobs/jobs-integration.test.ts`**. Each `it(...)` title is prefixed with a bracketed requirement ID so you can grep by ID.

| ID | Verified by |
|----|-------------|
| **JOBS-AUTH-001** | `[JOBS-AUTH-001]` — missing `Authorization` on list |
| **JOBS-LST-001** | `[JOBS-LST-001]` |
| **JOBS-LST-002** | `[JOBS-LST-002]` |
| **JOBS-ISO-001** | `[JOBS-ISO-001]` |
| **JOBS-GET-001** | `[JOBS-GET-001]` |
| **JOBS-GET-002** | `[JOBS-GET-002]` |
| **JOBS-CRT-001** | `[JOBS-CRT-001]` |
| **JOBS-CRT-002** | `[JOBS-CRT-002]` |
| **JOBS-SCH-001** | `[JOBS-SCH-001]` |
| **JOBS-SCH-002** | `[JOBS-SCH-002]` |
| **JOBS-SCH-003** | `[JOBS-SCH-003]` |
| **JOBS-TLR-001** | `[JOBS-TLR-001]` |
| **JOBS-TLR-002** | `[JOBS-TLR-002]` |
| **JOBS-TLR-003** | `[JOBS-TLR-003]` — subject + body scenarios |
| **JOBS-ISO-002** | `[JOBS-ISO-002]` |
| **JOBS-UPD-001** … **JOBS-UPD-005** | matching `[JOBS-UPD-00x]` titles |
| **JOBS-ISO-003** | `[JOBS-ISO-003]` |
| **JOBS-DEL-001**, **JOBS-DEL-002** | `[JOBS-DEL-001]`, `[JOBS-DEL-002]` |
| **JOBS-SSE-001** | `[JOBS-SSE-001]` |

When adding or changing a rule, assign a new ID (or revise this document) and add or adjust a test; keep this table aligned.

---

## Change control

- **Backend-only refactors** that preserve observable HTTP behavior need no ID change.
- **Contract changes** (routes, status codes, error codes, pagination shape, SSE event names) MUST update this document and any clients or tests that depend on them.
