# CI/CD Requirements

Implement three workflows.

---

## 1. Push Validation Workflow

### Trigger
- On every push to any non-main branch

### Purpose
Fast developer feedback.

### Requirements
- Check out repository
- Set up project runtime/environment
- Install dependencies
- Restore dependency cache when available
- Run unit test suite only
- Fail workflow if any unit test fails
- Publish test results/artifacts for debugging
- Keep execution optimized for speed

### Constraints
- Must complete quickly (<10 min target)
- Must not run integration tests
- Must not run regression tests
- Must not run E2E tests
- Must not run smoke tests

---

## 2. Pull Request Validation Workflow

### Trigger
- On pull request open
- On pull request synchronize/update
- On pull request reopen
- Target branch: `main`

### Purpose
Validate merge readiness.

### Requirements
- Check out repository
- Set up project runtime/environment
- Install dependencies
- Restore cache
- Run unit tests
- Run integration tests
- Fail if any test fails
- Publish logs/results/artifacts
- Report status checks to PR

### Branch Protection Requirements
- PR merge must be blocked unless workflow succeeds

### Constraints
- Must not run full regression suite
- Must not run full E2E suite
- Must not run smoke tests

---

## 3. Main Branch Validation Workflow

### Trigger
- On push to `main` (after merge)

### Purpose
Validate production-ready integrated state.

### Requirements
- Check out exact merged commit
- Set up runtime/environment
- Install dependencies
- Restore cache
- Build production artifact
- Run full regression suite
- Run end-to-end test suite
- Run smoke test suite
- Fail immediately on failure
- Store test reports/artifacts
- Store build artifact for downstream deployment

### Execution Order
1. Build
2. Regression tests
3. E2E tests
4. Smoke tests

### Constraints
- Must use production-equivalent configuration where applicable

---

# Cross-Workflow Requirements

## Concurrency
- Cancel obsolete in-progress runs for the same branch/PR when newer commits arrive

## Caching
- Cache dependencies
- Reuse caches across runs when possible
- Invalidate cache when dependency definitions change

## Test Reporting
- Persist machine-readable test results
- Persist logs on failure
- Make artifacts downloadable

## Failure Handling
- Workflow must fail on any failed test
- No partial success allowed

## Security
- Use least-privilege permissions
- Do not expose secrets to untrusted workflows
- Restrict protected branch writes

## Maintainability
- Avoid duplicated setup logic across workflows
- Extract reusable workflow steps where practical

---

# Test Scope Definitions

## Unit Tests
- Isolated logic validation
- No external dependencies

## Integration Tests
- Validate component interaction
- May use real or ephemeral dependencies

## Regression Tests
- Full application behavior validation
- Covers known bug prevention

## End-to-End (E2E) Tests
- Validate critical user flows end-to-end

## Smoke Tests
- Validate app startup and critical-path health only

---

# Success Criteria

## Push Workflow
- Fast feedback
- Unit-only validation

## Pull Request Workflow
- Merge gate protection
- Unit + integration confidence

## Main Workflow
- Full confidence in merged state
- Production-ready artifact validated