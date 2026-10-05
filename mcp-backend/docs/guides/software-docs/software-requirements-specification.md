# Requirements Management & Traceability

How requirements relate to design, implementation, and tests.  
Conventions and file layout: [requirements README](../../specs/requirements/README.md), [architecture README](../../specs/architecture/README.md).  
Doc stack overview: [software documentation](./software-documentation.md).

---

# Functional Requirements (FR)

**Answer:** *What must the system do?*

Observable product behavior. Not routes, status codes, cookie names, or storage APIs.

- **FR-AUTH-LOG-001** — The system shall authenticate a user who supplies a registered email and the correct password.
- **FR-JOBS-CRT-001** — The system shall allow a user to create a job with a schedule or without one.

Quality bar: atomic, unambiguous, testable, measurable. Writing rules and IDs: [requirements README](../../specs/requirements/README.md).

---

# Non-Functional Requirements (NFR)

**Answer:** *How well must the system perform?*

Measurable qualities (security, timing, limits).

- **NFR-SEC-AUTH-001** — Passwords shall be stored using bcrypt with a cost factor of 10.
- **NFR-SEC-AUTH-004** — Access tokens shall expire after 7 hours.

Typically verified via security testing, config checks, load testing, and monitoring.

---

# Traceability

```text
FR / NFR  →  Architecture (HTTP, Client, ADR, OpenAPI, …)  →  Implementation  →  Tests → Monitoring
```

```text
FR-AUTH-LOG-001
      ⇅
HTTP-AUTH-LOG-001          POST /api/auth/login → 200 + tokens
      ⇅
AuthController.login
      ⇅
TC-AUTH-LOG-001
```

```text
FR-JOBS-RUN-003
      ⇅
CLIENT-JOBS-RUN-001        /jobs — run from list without opening edit
      ⇅
Jobs UI + jobs API client
      ⇅
Playwright [CLIENT-JOBS-RUN-001]
```

Downstream artifacts cite the FR (and the HTTP or client ID at the boundary). One FR may span several technical pieces — document those in architecture, not as extra FRs.

HTTP scenario rules and IDs: [architecture/http](../../specs/architecture/http/README.md).  
Client scenario rules and IDs: [architecture/client](../../specs/architecture/client/README.md).

Change control: FR/NFR first → architecture acceptance → tests and implementation.

---

# Verification

| Type | Typical proof |
|------|----------------|
| Functional | Unit, integration, E2E (cite `FR-…` / `HTTP-…` / `CLIENT-…`) |
| Security | Pen test, static analysis, config/contract checks |
| Performance | Load / stress |
| Availability / reliability | Failover, chaos, endurance |
| Accessibility | WCAG |

A requirement is complete only when verification has passed.

---

# Principles

- FRs = what; NFRs = how well; architecture = how at a boundary (HTTP and client).
- Stable IDs; cite them in design, code, and tests.
- Full traceability from specification through production monitoring.
