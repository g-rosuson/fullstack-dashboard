# Logout

End an authenticated session.

- **FR-AUTH-OUT-001** — When the user logs out with a valid refresh credential present, the system shall end the session and invalidate that credential.
- **FR-AUTH-OUT-002** — After logout, the system shall not renew an access token until the user authenticates again.
- **FR-AUTH-OUT-003** — The system shall reject logout when no valid refresh credential is present.
- **FR-AUTH-OUT-004** — After logout, the system shall return the user to the login view as unauthenticated.
- **FR-AUTH-OUT-005** — When a session ends, the conversations shown for that session shall be discarded.
