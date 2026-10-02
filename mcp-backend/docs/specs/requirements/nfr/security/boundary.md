# Request boundary

- **NFR-SEC-BND-001** — The system shall reject a request whose host is missing or not on the host allowlist.
- **NFR-SEC-BND-002** — When an origin allowlist is in effect, the system shall reject a request whose origin host is not on that allowlist.
- **NFR-SEC-BND-003** — The system shall accept a request that omits origin when its host is allowed.
- **NFR-SEC-BND-004** — Host and origin checks shall compare hostnames only. A port on the header shall not change the decision.
- **NFR-SEC-BND-005** — When the bind address is not loopback, the process shall not start unless a host allowlist is configured.
- **NFR-SEC-BND-006** — When the bind address is loopback and no host allowlist is configured, the allowlist shall be `localhost`, `127.0.0.1`, and `::1`.
- **NFR-SEC-BND-007** — When the bind address is loopback and no origin allowlist is configured, origins shall be limited to `localhost`, `127.0.0.1`, and `[::1]`.
- **NFR-SEC-BND-008** — When the bind address is not loopback and no origin allowlist is configured, the system shall not check origin.
- **NFR-SEC-BND-009** — An unhandled failure outside the MCP handler shall be answered with a generic error body that includes neither a stack trace nor the exception message.
- **NFR-SEC-BND-010** — The startup configuration log shall record whether error reporting is enabled and shall not record the error-reporting DSN.
