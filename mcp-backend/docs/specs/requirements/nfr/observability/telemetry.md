# Telemetry

- **NFR-OBS-TEL-001** — Each emitted log line shall be one JSON object on stdout with `ts` (ISO-8601 UTC), `level`, and `msg`. A line that is emitted shall not be truncated.
- **NFR-OBS-TEL-002** — The log floor order shall be `debug`, then `info`, then `warn`, then `error`. A level below the floor shall not be printed.
- **NFR-OBS-TEL-003** — Each HTTP request shall be logged at info with `requestId`, `method`, `path`, `status`, and `durationMs`. `mcpMethod` and `mcpName` shall be included when those request headers are present.
- **NFR-OBS-TEL-004** — When a log field is an error, the printed value shall include `name`, `message`, and `stack`.
- **NFR-OBS-TEL-005** — When a DSN is configured, unhandled application errors, MCP handler errors, uncaught exceptions, and unhandled rejections shall be reported to Sentry.
- **NFR-OBS-TEL-006** — When a DSN is configured and the JSON-RPC body carries `traceparent` on `_meta` at the root or under `params`, spans for that request shall continue that trace. `baggage` on that same `_meta` shall be forwarded with the trace. A W3C `traceparent` shall be converted to Sentry's trace format. A value that is already a Sentry trace shall be kept. No `traceparent` shall start a new trace.
