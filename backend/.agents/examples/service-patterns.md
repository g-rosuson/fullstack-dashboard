# Backend Service Patterns

Canonical examples for repositories, validation utilities, and exception usage.

---

## Repository Pattern

```typescript
// backend/src/aop/db/mongo/repository/user/index.ts
import { Db } from 'mongodb';
import { SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';
import config from '../../config';
import { ErrorMessage } from 'shared/enums/error-messages';
import type { CreateUserPayload } from './types';
import { userDocumentSchema } from './schemas';

export class UserRepository {
    private db: Db;
    private collectionName: string;

    constructor(db: Db) {
        this.db = db;
        this.collectionName = config.db.collection.users.name;
    }

    async getByEmail(email: string) {
        const doc = await this.db.collection(this.collectionName).findOne({ email });

        if (!doc) return null;

        const result = parseSchema(userDocumentSchema, doc);

        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: result.issues,
            });
        }

        return result.data;
    }

    async create(user: CreateUserPayload) {
        return await this.db.collection(this.collectionName).insertOne(user);
    }
}
```

Key rules:
- Always validate returned documents with `parseSchema` before use.
- Throw `SchemaValidationException` on schema validation failure.
- Collection name comes from `config.db.collection.<name>.name`.

---

## Zod Validation Utility

```typescript
// backend/src/lib/validation/index.ts
import { ZodSchema } from 'zod';
import mappers from './mappers';
import { SchemaResult } from './types';

export const parseSchema = <T>(schema: ZodSchema<T>, data: unknown): SchemaResult<T> => {
    const { success, data: parsedData, error } = schema.safeParse(data);
    return success
        ? { success, data: parsedData }
        : { success, issues: mappers.mapToErrors(error) };
};
```

---

## Exception Usage

```typescript
// Input doesn't match schema
throw new InputValidationException(ErrorMessage.AUTHENTICATION_SCHEMA_VALIDATION_FAILED, { issues });

// User identity check failed
throw new UnauthorizedException(ErrorMessage.USER_NOT_FOUND);

// JWT expired or malformed
throw new TokenException(ErrorMessage.TOKEN_INVALID);

// Resource does not exist
throw new ResourceNotFoundException(ErrorMessage.JOB_NOT_FOUND);

// Domain rule violation
throw new BusinessLogicException(ErrorMessage.JOBS_CANNOT_BE_UPDATED_WHILE_RUNNING);

// MongoDB doc failed Zod validation
throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, { issues });
```

All exceptions are caught by `exceptionsMiddleware` and serialized as:

```json
{ "success": false, "issues": [], "code": "ERROR_TYPE", "timestamp": "2024-01-01T00:00:00.000Z" }
```
