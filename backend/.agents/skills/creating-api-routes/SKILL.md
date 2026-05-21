---
name: creating-api-routes
description: Create a complete Express feature module following the repository's module quintet: controller, middleware, routing, registry, schemas, and types. Covers request context usage, middleware chain ordering, route constant usage, and OpenAPI registration. Use when adding a new feature module or a new endpoint to an existing module.
---

# Purpose

Implement new API endpoints using the five-file module pattern that all feature modules (`auth`, `jobs`) follow in this repository.

# When To Use

- Adding a new feature module (e.g. `notifications`, `settings`).
- Adding a new endpoint to an existing module (`jobs`, `auth`).
- Wiring a new controller action into the Express router.
- Registering a new path in the OpenAPI spec.

# Required Patterns

## Module quintet

Every feature module under `modules/<name>/` MUST contain:

```
modules/<name>/
├── <name>-controller.ts   Route handlers — read from req, call db/services, respond
├── <name>-middleware.ts   Input validation and route guards (call next() or throw)
├── <name>-routing.ts      Express Router — wire middleware chain to controller
├── <name>-registry.ts     OpenAPI path registration (zod-to-openapi)
├── schemas/               Zod schemas for request/response shapes
└── types/                 TypeScript types derived from schemas (z.infer)
```

## Controller conventions

- Async functions: `async (req: Request<Params, ResBody, ReqBody>, res: Response) => { ... }`.
- Read all infrastructure from `req.context` — never inject as module-level singletons.
- Respond success with `res.status(HttpStatusCode.X).json({ success: true, data: ... })`.
- Throw typed exceptions (`aop/exceptions`) for all error paths — never `res.json` errors.
- No business logic in controllers — delegate to middleware and repositories.

## Request context

| Property | Description |
|---|---|
| `req.context.db.repository.users` | `UserRepository` — user DB operations |
| `req.context.db.repository.jobs` | `JobsRepository` — job DB operations |
| `req.context.db.transaction` | MongoDB session source for transactions |
| `req.context.user.id` | Authenticated user ID (string) |
| `req.context.scheduler` | Cron job scheduling |
| `req.context.delegator` | Job execution delegation |
| `req.context.emitter` | SSE event bus |

## Middleware conventions

- Return `next()` on success; throw a typed exception on failure.
- Validate request body in middleware using `validateRequestPayload(schema, req.body, ErrorMessage.X)` before the controller runs.

## Routing — middleware chain order

```typescript
router.METHOD(
    constants.routes.<module>.<action>,
    rateLimiter?,          // optional, required on auth routes
    validateUserInput,     // shared — checks Content-Type and body presence
    domainMiddleware,      // module-specific Zod validation
    controller             // last in chain
);
```

Public routes are mounted before `authenticateContextMiddleware`. Private routes are protected by it globally in `server/index.ts`.

## Route constants

ALWAYS use `constants.routes.<module>.<path>` from `shared/constants/routes`. Never hardcode strings.

# Implementation Steps

## Creating a new module

1. Create `modules/<name>/` folder with the quintet files.

2. **`<name>-routing.ts`**: Create a Router, add routes using `constants.routes.<name>.*`, export the router.

3. **`<name>-controller.ts`**: Define one async function per action; use `req.context` for all infra access; respond with canonical JSON shape; export named functions.

4. **`<name>-middleware.ts`**: Define domain-specific middleware; use `validateRequestPayload`; export named middleware functions.

5. **`schemas/index.ts`**: Define Zod schemas for request bodies and response data shapes.

6. **`types/index.ts`**: Export types derived from schemas using `z.infer`.

7. **`<name>-registry.ts`**: Register each path with `registry.registerPath(...)`.

8. **`server/index.ts`**: Mount the router (public: before auth middleware; private: after).

## Adding an endpoint to an existing module

1. Add the Zod schema to `schemas/index.ts`.
2. Add the derived type to `types/index.ts`.
3. Add the middleware function to `<name>-middleware.ts`.
4. Add the controller function to `<name>-controller.ts`.
5. Add the route to `<name>-routing.ts` with the correct middleware chain.
6. Register the path in `<name>-registry.ts`.

# Examples

## Controller action

```typescript
import { Request, Response } from 'express';
import { ResourceNotFoundException } from 'aop/exceptions';
import { ErrorMessage } from 'shared/enums/error-messages';
import { HttpStatusCode } from 'shared/enums/http-status-codes';
import { IdRouteParam } from './types';

const getJob = async (req: Request<IdRouteParam>, res: Response) => {
    const job = await req.context.db.repository.jobs.getById(req.params.id, req.context.user.id);

    if (!job) {
        throw new ResourceNotFoundException(ErrorMessage.JOB_NOT_FOUND);
    }

    res.status(HttpStatusCode.OK).json({ success: true, data: job });
};

export { getJob };
```

## Middleware action

```typescript
import { NextFunction, Request, Response } from 'express';
import { validateRequestPayload } from 'aop/http/validators';
import { ErrorMessage } from 'shared/enums/error-messages';
import { createJobInputSchema } from './schemas';

const validateCreateJobInput = (req: Request, _res: Response, next: NextFunction) => {
    validateRequestPayload(createJobInputSchema, req.body, ErrorMessage.INPUT_VALIDATION_FAILED);
    next();
};

export { validateCreateJobInput };
```

## Routing file

```typescript
import { Router } from 'express';
import constants from 'shared/constants';
import { validateUserInput } from 'modules/shared/middleware';
import { validateCreateJobInput } from './jobs-middleware';
import { createJob, getJob } from './jobs-controller';

const router = Router();

router.post(constants.routes.jobs.create, validateUserInput, validateCreateJobInput, createJob);
router.get(constants.routes.jobs.getById, getJob);

export default router;
```

# Edge Cases

- **Public vs private routes**: Mount public routes before `authenticateContextMiddleware` in `server/index.ts`. All routes mounted after the auth middleware require a valid Bearer token.
- **Route param typing**: Use `Request<{ id: string }>` for routes with URL params; derive param types from `z.infer` schemas.
- **Paginated list**: Parse `req.query.limit` and `req.query.offset` as integers with `parseInt(..., 10)`; default to `0` if absent.

# Anti-Patterns

- **Never** hardcode route path strings in routing files — use `constants.routes.*`.
- **Never** put business logic or validation in controllers.
- **Never** access MongoDB directly in controllers — use `req.context.db.repository.*`.
- **Never** import from other feature modules — modules must not depend on each other.
- **Never** inject infrastructure (db, scheduler) as module-level variables — always use `req.context`.
- **Never** omit `<name>-registry.ts` registration for new endpoints.

# Validation Checklist

- [ ] All five module files created (controller, middleware, routing, registry, schemas+types)
- [ ] Route paths use `constants.routes.*` — no hardcoded strings
- [ ] Middleware chain order: rateLimiter → validateUserInput → domainMiddleware → controller
- [ ] Controller uses `req.context` for all DB and infra access
- [ ] Controller responds with canonical `{ success: true, data: ... }` shape
- [ ] Typed exceptions thrown — no manual error responses
- [ ] Router mounted in `server/index.ts` at the correct position (public or private)
- [ ] Path registered in `<name>-registry.ts`
- [ ] `npm run type-check` passes
