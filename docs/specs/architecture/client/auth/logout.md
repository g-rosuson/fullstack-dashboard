# Client — Logout

Routes: authenticated shell → `/login`

## CLIENT-AUTH-OUT-001 — Logout returns to login

- Setup: authenticated user
- Action: log out
- Assert: user lands on login as unauthenticated

Traces:
- [FR-AUTH-OUT-001](../../../requirements/fr/auth/logout.md)
- [FR-AUTH-OUT-004](../../../requirements/fr/auth/logout.md)
- [HTTP-AUTH-OUT-002](../../http/auth/logout.md)

## CLIENT-AUTH-OUT-002 — Protected areas unavailable after logout

- Setup: user has just logged out (CLIENT-AUTH-OUT-001)
- Action: visit a protected area (e.g. `/jobs`)
- Assert: protected area remains unavailable; user stays on (or is sent to) login

Traces:
- [FR-AUTH-OUT-002](../../../requirements/fr/auth/logout.md)
- [FR-AUTH-ACL-003](../../../requirements/fr/auth/access-control.md)
- [HTTP-AUTH-OUT-003](../../http/auth/logout.md)

## CLIENT-AUTH-OUT-003 — Session end discards conversations

- Setup: the session has conversations
- Action: log out, a refresh fails, or the session is invalid
- Assert: the user is on login, and no conversations from that session are shown

Traces:

- [FR-AUTH-OUT-005](../../../requirements/fr/auth/logout.md)
- [FR-AUTH-OUT-004](../../../requirements/fr/auth/logout.md)
