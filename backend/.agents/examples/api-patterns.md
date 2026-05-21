# Backend API Patterns

Canonical examples derived from `auth` and `jobs` modules.

---

## Controller Handler

```typescript
// backend/src/modules/jobs/jobs-controller.ts

const createJob = async (req: Request<unknown, unknown, CreateJobInput>, res: Response) => {
    const session = req.context.db.transaction.startSession();
    let isCommitted = false;

    try {
        session.startTransaction();

        const payload = {
            userId: req.context.user.id,
            name: req.body.name,
            tools: req.body.tools.map(tool => mappers.mapToIds(tool)),
            schedule: req.body.schedule,
            createdAt: new Date().toISOString(),
            updatedAt: null,
        };

        const created = await req.context.db.repository.jobs.create(payload, session);

        await session.commitTransaction();
        isCommitted = true;

        res.status(HttpStatusCode.CREATED).json({ success: true, data: created });
    } catch (error) {
        if (!isCommitted) await session.abortTransaction();
        logger.error('Failed to create job', { error: error as Error });
        throw error;
    } finally {
        await session.endSession();
    }
};
```

---

## Input Validation Middleware

```typescript
// backend/src/modules/auth/auth-middleware.ts

const validateAuthenticationInput = (req: Request, _res: Response, next: NextFunction) => {
    const isRegistering = req.path === constants.routes.auth.register;
    const schema = isRegistering ? registerUserInputSchema : loginUserInputSchema;

    const validatedPayload = validateRequestPayload(
        schema,
        req.body,
        ErrorMessage.AUTHENTICATION_SCHEMA_VALIDATION_FAILED
    );

    req.body = validatedPayload;
    next();
};
```

---

## Router Wiring

```typescript
// backend/src/modules/auth/auth-routing.ts

const router = Router();

router.post(constants.routes.auth.login, loginLimiter, validateUserInput, validateAuthenticationInput, login);
router.post(constants.routes.auth.register, registerLimiter, validateUserInput, validateAuthenticationInput, register);
router.post(constants.routes.auth.logout, validateRefreshToken, logout);
router.get(constants.routes.auth.refresh, refreshLimiter, validateRefreshToken, renewAccessToken);

export default router;
```

---

## Zod Request Schema

```typescript
// backend/src/modules/auth/schemas/login-user-input.schema.ts
import { z } from 'zod';

export const loginUserInputSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;
```

---

## OpenAPI Registry

```typescript
// backend/src/modules/auth/auth-registry.ts
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import constants from 'shared/constants';
import { accessTokenSchema, loginUserInputSchema } from './schemas';

const authRegistry = new OpenAPIRegistry();

authRegistry.registerPath({
    method: 'post',
    path: constants.routes.auth.login,
    request: {
        body: {
            content: { 'application/json': { schema: loginUserInputSchema } },
        },
    },
    responses: {
        200: {
            description: 'Access token on successful login',
            content: { 'application/json': { schema: accessTokenSchema } },
        },
    },
});

export default authRegistry;
```

---

## Response Shapes

```typescript
// Single resource
res.status(HttpStatusCode.OK).json({ success: true, data: resource });

// Created resource
res.status(HttpStatusCode.CREATED).json({ success: true, data: created });

// Paginated list
res.status(HttpStatusCode.OK).json({
    success: true,
    data: items,
    limit,
    offset,
    count: items.length,
});

// No data body (e.g. logout)
res.status(HttpStatusCode.OK).json({ success: true, meta: { timestamp: Date.now() } });
```
