# Process reliability

- **NFR-REL-PRC-001** — The process shall not accept traffic when required configuration is missing or invalid. It shall log the field errors and exit with code 1. Required values are a non-empty bind address, a positive integer port, a log level of `debug`, `info`, `warn`, or `error`, and a positive integer shutdown timeout.
- **NFR-REL-PRC-002** — When the error-reporting DSN is omitted or blank, error reporting shall stay off and the process shall still be able to start.
- **NFR-REL-PRC-003** — When a DSN is set, it shall be a URL. An omitted environment name shall mean `production`. An omitted release shall mean the package version. An omitted trace sample rate shall be `0.1` when a DSN is set and `0` when it is not. An explicit sample rate shall be a number from `0` through `1` inclusive.
- **NFR-REL-PRC-004** — An environment name, when set, shall be at most 64 characters, shall not be `None`, and shall not contain a space or a slash.
- **NFR-REL-PRC-005** — On `SIGTERM` or `SIGINT`, the process shall stop accepting connections, close the MCP handler, flush error reporting, and exit with code 0, within the configured shutdown timeout.
- **NFR-REL-PRC-006** — A shutdown that is already in progress shall not start a second teardown.
- **NFR-REL-PRC-007** — If shutdown does not finish within the configured timeout, the process shall exit with code 1.
- **NFR-REL-PRC-008** — An uncaught exception or unhandled rejection shall shut the process down with exit code 1.
- **NFR-REL-PRC-009** — A failure while starting shall use that same teardown and exit with code 1.
