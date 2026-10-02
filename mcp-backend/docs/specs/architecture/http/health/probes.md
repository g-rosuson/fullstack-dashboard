# HTTP — Health probes

Host allowlist: [HTTP-MCP-BND-002](../mcp/boundary.md).

## HTTP-HEALTH-LIV-001 — Live while up

`GET /health/live`

- Request:
  - Allowed `Host`
- Response:
  - Status: `200`
  - Body: `{ status: "ok" }`

Traces:

- [FR-HEALTH-LIV-001](../../../requirements/fr/health/probes.md)

## HTTP-HEALTH-LIV-002 — Not live after shutdown starts

`GET /health/live`

- Request:
  - Allowed `Host`
  - Shutdown has been marked
- Response:
  - Status: `503`
  - Body: `{ status: "unavailable" }`

Traces:

- [FR-HEALTH-LIV-001](../../../requirements/fr/health/probes.md)

## HTTP-HEALTH-RDY-001 — Ready while accepting traffic

`GET /health/ready`

- Request:
  - Allowed `Host`
  - Listener is up and shutdown has not started
- Response:
  - Status: `200`
  - Body: `{ status: "ok" }`

Traces:

- [FR-HEALTH-RDY-001](../../../requirements/fr/health/probes.md)

## HTTP-HEALTH-RDY-002 — Not ready after shutdown starts

`GET /health/ready`

- Request:
  - Allowed `Host`
  - Shutdown has been marked
- Response:
  - Status: `503`
  - Body: `{ status: "unavailable" }`

Traces:

- [FR-HEALTH-RDY-001](../../../requirements/fr/health/probes.md)
