# HTTP — Health

- `GET /health/live`
- `GET /health/ready`

Scenarios:

- [probes.md](./probes.md) — `HTTP-HEALTH-LIV-*`, `HTTP-HEALTH-RDY-*`

Before the listener is up, readiness is not observable on this boundary. That case of [FR-HEALTH-RDY-001](../../../requirements/fr/health/probes.md) is tested on the lifecycle module.
