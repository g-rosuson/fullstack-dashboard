---
name: api-contracts
description: Define and maintain API contracts between the Express backend and React frontend using Zod schemas, OpenAPI registry, and Orval-generated types. Covers request/response shapes, schema derivation, OpenAPI path registration, and type regeneration. Use when adding a new endpoint, changing request/response shapes, or regenerating frontend types.
---

# Purpose

Ensure the API contract between backend and frontend stays consistent — Zod-first schema definition on the backend, OpenAPI spec generation, and Orval-driven type generation on the frontend.

# When To Use

- Adding a new API endpoint.
- Changing an existing request body or response shape.
- Running `npm run generate-types` on the frontend after backend schema changes.
- Debugging type mismatches between what the backend returns and what the frontend expects.

# Required Patterns

## Shared response shapes

All backend responses use one of these shapes:

```typescript
// Single resource
{ success: true, data: T }

// Auth operations (with timestamp metadata)
{ success: true, data: T, meta: { timestamp: number } }

// Paginated list
{ success: true, data: T[], limit: number, offset: number, count: number }

// Error (produced by exceptionsMiddleware only)
{ success: false, issues: ZodIssue[], code: string, timestamp: string }
```

Controllers MUST NOT produce custom shapes outside these four.

## Schema-first — derive TypeScript types from Zod

```typescript
// ✅ In modules/<name>/schemas/
import { z } from 'zod';

export const createJobInputSchema = z.object({
    name: z.string().min(1),
    tools: z.array(toolSchema),
    schedule: jobScheduleSchema.nullable(),
});

// ✅ In modules/<name>/types/
import { z } from 'zod';
import { createJobInputSchema } from '../schemas';

export type CreateJobInput = z.infer<typeof createJobInputSchema>;

// ❌ Never write duplicate manual types
interface CreateJobInput { name: string; tools: Tool[]; ... }
```

## OpenAPI registration — `*-registry.ts`

Every module registers its paths in a `<name>-registry.ts` using `zod-to-openapi`:

```typescript
import { registry } from 'services/openapi';

registry.registerPath({
    method: 'post',
    path: '/jobs',
    summary: 'Create a job',
    request: {
        body: {
            content: { 'application/json': { schema: createJobInputSchema } },
        },
    },
    responses: {
        201: {
            description: 'Job created',
            content: { 'application/json': { schema: createJobResponseSchema } },
        },
    },
});
```

## Frontend — generated types from Orval

- API types live in `src/_types/_gen/`. Do NOT edit these files manually.
- Regenerate after backend schema changes: `npm run generate-types` (inside `frontend/`).
- Import generated types: `import type { CreateJobInput, Job } from '@/_types/_gen'`.

# Implementation Steps

## Adding a new endpoint contract

1. **Backend — define schemas** in `modules/<name>/schemas/`:
   - `<action>InputSchema` for request body.
   - `<action>ResponseSchema` for the `data` field in the success response.

2. **Backend — derive types** in `modules/<name>/types/`:
   ```typescript
   export type CreateJobInput = z.infer<typeof createJobInputSchema>;
   ```

3. **Backend — validate in middleware** using `validateRequestPayload(schema, req.body, ErrorMessage.X)`.

4. **Backend — register in `*-registry.ts`** with request + response schemas.

5. **Backend — run `npm run generate-spec`** to refresh the OpenAPI JSON (if applicable).

6. **Frontend — regenerate types**: `cd frontend && npm run generate-types`.

7. **Frontend — import from `@/_types/_gen`** in resource functions and components.

## Changing an existing shape

1. Update the Zod schema in `modules/<name>/schemas/`.
2. The derived `z.infer<>` type updates automatically — check for TypeScript errors with `npm run type-check`.
3. Update the `*-registry.ts` if the OpenAPI doc needs updating.
4. Regenerate frontend types: `cd frontend && npm run generate-types`.
5. Fix any `@/_types/_gen` import usages that broke due to the shape change.

# Examples

## Request schema with enum and optional fields

```typescript
export const updateJobInputSchema = z.object({
    name: z.string().min(1),
    tools: z.array(toolIdSchema),
    schedule: jobScheduleSchema.nullable(),
    runJob: z.boolean().optional(),
});

export type UpdateJobInput = z.infer<typeof updateJobInputSchema>;
```

## Paginated list response

```typescript
res.status(HttpStatusCode.OK).json({
    success: true,
    data: enrichedJobs,
    limit,
    offset,
    count: enrichedJobs.length,
});
```

## Frontend consuming a generated type

```typescript
import type { CreateJobInput } from '@/_types/_gen';
import api from '@/api';

const payload: CreateJobInput = { name, tools, schedule };
const response = await api.service.resources.jobs.create(payload);
```

# Edge Cases

- **Type drift**: If the frontend types are not regenerated after backend schema changes, TypeScript will fail at `npm run type-check`. Always regenerate after any schema change.
- **Nullable vs optional**: Zod `.nullable()` is `T | null`; `.optional()` is `T | undefined`. Use `.nullable()` for fields that can be explicitly cleared (e.g. `schedule: null`), and `.optional()` for fields that may be omitted from the request.
- **`z.infer` and discriminated unions**: When schemas use `z.discriminatedUnion`, `z.infer` produces a proper union type. Do not flatten it into a manual interface.

# Anti-Patterns

- **Never** write TypeScript interfaces that duplicate a Zod schema — use `z.infer<typeof schema>`.
- **Never** manually edit files in `src/_types/_gen/` — they are overwritten by Orval.
- **Never** hardcode response shapes differently from the four canonical shapes.
- **Never** return raw MongoDB documents — always map through a typed schema before `res.json`.
- **Never** skip `*-registry.ts` registration when adding a new route — OpenAPI spec completeness requires it.

# Validation Checklist

- [ ] Request body has a Zod schema in `modules/<name>/schemas/`
- [ ] TypeScript type derived with `z.infer` — no duplicate manual definitions
- [ ] Response uses one of the four canonical shapes
- [ ] Path registered in `<name>-registry.ts` with correct request + response schemas
- [ ] Frontend types regenerated after any backend schema change
- [ ] Frontend components import from `@/_types/_gen`, not manual type files
- [ ] `npm run type-check` passes in both packages
