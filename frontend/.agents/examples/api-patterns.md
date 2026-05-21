# Frontend API Patterns

Canonical examples for API resource functions and the HTTP client.

---

## API Resource Module

```typescript
// frontend/src/api/service/resources/authentication/index.ts
import client from '../../client';
import config from './config';
import { AccessToken, LoginUserInput, RegisterUserInput } from '@/_types/_gen';
import { ApiResponse } from '@/_types/infrastructure';

const refreshAccessToken = async () => {
    return await client.get<ApiResponse<AccessToken>>(config.path.refresh);
};

const register = async (credentials: RegisterUserInput) => {
    return await client.post<ApiResponse<AccessToken>, RegisterUserInput>(config.path.register, credentials);
};

const login = async (credentials: LoginUserInput) => {
    return await client.post<ApiResponse<AccessToken>, LoginUserInput>(config.path.login, credentials);
};

const logout = async () => {
    return await client.post<ApiResponse>(config.path.logout);
};

const resources = { refreshAccessToken, register, login, logout };
export default resources;
```

---

## HTTP Client (`rest.ts`)

```typescript
// frontend/src/api/service/client/rest.ts

const _fetch = async (path: string, fetchOptions: FetchOptions) => {
    const url = buildUrl(path);
    const accessToken = useStore.getState().accessToken;

    const options: RequestInit = {
        method: fetchOptions.method,
        credentials: 'include',
        body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
        const json = await response.json();
        const result = errorSchema.safeParse(json.error);
        if (!result.success) throw new CustomError(`Request to "${url}" failed`);
        throw new CustomError(result.data.message, result.data.issues);
    }

    return await response.json();
};

const get = async <TResp>(path: string): Promise<TResp> => _fetch(path, { method: 'GET' });
const post = async <TResp, TBody = undefined>(path: string, body?: TBody): Promise<TResp> => _fetch(path, { method: 'POST', body });
const put = async <TResp, TBody = undefined>(path: string, body?: TBody): Promise<TResp> => _fetch(path, { method: 'PUT', body });
const del = async <TResp>(path: string): Promise<TResp> => _fetch(path, { method: 'DELETE' });

export { del, get, post, put };
```
