---
name: error-handling
description: Implement consistent error handling across backend and frontend. Covers typed exception classes, exceptionsMiddleware serialization, the frontend CustomError class, and the try/catch/finally pattern. Use when adding error paths to controllers, middleware, repositories, or React components.
---

# Purpose

Ensure all error paths follow established conventions — typed backend exceptions that flow through `exceptionsMiddleware`, and structured `CustomError` with `issues` on the frontend.

# When To Use

- Writing a new controller action that may fail.
- Adding repository methods that can return not-found or validation errors.
- Implementing form submission or API calls in React components.
- Debugging error serialization mismatches between backend and frontend.

# Required Patterns

## Backend — throw typed exceptions, never manual responses

Import from `aop/exceptions`. Choose the exception by failure category:

| Exception | When |
|---|---|
| `UnauthorizedException` | User identity check failed (wrong password, user not found) |
| `TokenException` | JWT invalid, missing, or expired |
| `ConflictException` | Duplicate unique key (MongoDB 11000 is auto-converted) |
| `ResourceNotFoundException` | Document requested but not found |
| `BusinessLogicException` | Domain rule violated (e.g. job running, cannot update) |
| `InputValidationException` | Request body fails Zod schema |
| `SchemaValidationException` | MongoDB document fails Zod schema on read |
| `DatabaseException` | Unclassified MongoDB error |
| `InternalException` | Unexpected / unhandled error |

```typescript
import { ResourceNotFoundException, BusinessLogicException } from 'aop/exceptions';
import { ErrorMessage } from 'shared/enums/error-messages';

// ✅ Correct
throw new ResourceNotFoundException(ErrorMessage.JOB_NOT_FOUND);
throw new BusinessLogicException(ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING);

// ❌ Never
res.status(404).json({ success: false, message: 'Not found' });
```

## Backend — error response shape

`exceptionsMiddleware` (registered last on the Express app) catches all thrown exceptions and serializes them. Controllers never produce error responses directly.

```json
{
    "success": false,
    "issues": [],
    "code": "RESOURCE_NOT_FOUND",
    "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Backend — transaction error re-throw

Inside a transaction `catch` block: abort if not yet committed, log with `logger.error`, then **re-throw** so `exceptionsMiddleware` handles serialization.

```typescript
} catch (error) {
    if (!isCommitted) {
        await session.abortTransaction();
    }
    logger.error('Operation failed', { error: error as Error });
    throw error;  // ← required
} finally {
    await session.endSession();
}
```

## Backend — logging

Use `logger` from `aop/logging`. Never `console.log` / `console.error`.

```typescript
import { logger } from 'aop/logging';

logger.error('Failed to create job', { error: error as Error });
logger.warn('Unexpected state encountered');
logger.info('User registered', { userId });
```

## Frontend — CustomError

`rest.ts` parses non-2xx responses with `errorSchema` and throws `CustomError(message, issues)`. Components catch this to surface field-level errors.

```typescript
import { CustomError } from '@/services/error';
import logging from '@/services/logging';

try {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await api.service.resources.someResource.create(payload);
    // handle success
} catch (error) {
    if (error instanceof CustomError) {
        // error.issues contains structured field-level errors from the backend
        // surface them in the UI as needed
    }
    logging.error(error as Error);
} finally {
    setState(prev => ({ ...prev, isLoading: false }));
}
```

`isLoading` MUST be cleared in `finally`, not in both `try` and `catch`.

# Implementation Steps

## Backend — adding error path to a controller

1. Import the appropriate exception class from `aop/exceptions`.
2. Import `ErrorMessage` from `shared/enums/error-messages`.
3. Throw the exception where the failure condition is detected.
4. Do not add a `catch` block in the controller unless you need transaction cleanup.
5. If in a transaction, add the `catch` + `finally` pattern from above.

## Frontend — adding error path to a component

1. Wrap the API call in `try/catch/finally`.
2. Set `isLoading: true` at the top of `try` (before the await).
3. In `catch`, check `instanceof CustomError` for structured issues; always call `logging.error`.
4. In `finally`, set `isLoading: false`.
5. Never swallow errors silently.

# Examples

## Backend — not-found guard in controller

```typescript
const job = await req.context.db.repository.jobs.getById(id, userId);

if (!job) {
    throw new ResourceNotFoundException(ErrorMessage.JOB_NOT_FOUND);
}
```

## Backend — schema validation failure in repository

```typescript
const result = parseSchema(jobDocumentSchema, rawDocument);

if (!result.success) {
    throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
        issues: result.issues,
    });
}
```

## Frontend — surfacing field issues

```typescript
} catch (error) {
    if (error instanceof CustomError && error.issues.length > 0) {
        setState(prev => ({ ...prev, fieldErrors: error.issues }));
    }
    logging.error(error as Error);
}
```

# Edge Cases

- **MongoDB 11000 (duplicate key)**: `exceptionsMiddleware` converts this to `ConflictException` automatically. Do not catch error code `11000` in repositories or controllers.
- **Stack traces in production**: `config.isDeveloping` gates stack trace inclusion in error responses. Never expose stacks in production.
- **Unhandled promise rejections in controllers**: Express 5 propagates async errors automatically — no need for `try/catch` wrappers unless transaction cleanup is required.

# Anti-Patterns

- **Never** call `res.status().json()` for error responses inside controllers.
- **Never** use generic `throw new Error(...)` — use the typed exception hierarchy.
- **Never** swallow errors with empty `catch (e) {}`.
- **Never** use `console.log` or `console.error` in production code paths — use `logger`.
- **Never** clear `isLoading` in both `try` success and `catch` — use `finally` only.
- **Never** re-throw after a committed transaction — only abort when `!isCommitted`.

# Validation Checklist

- [ ] Correct exception class imported from `aop/exceptions`
- [ ] `ErrorMessage` enum used (not a raw string)
- [ ] No manual `res.status().json()` error responses in controllers
- [ ] Transaction `catch` blocks abort-if-uncommitted then re-throw
- [ ] `session.endSession()` in `finally`, not in `catch`
- [ ] `logger` used for server-side logging, not `console`
- [ ] Frontend `isLoading` cleared in `finally`
- [ ] `CustomError` checked with `instanceof` before accessing `.issues`
- [ ] No silently swallowed errors
