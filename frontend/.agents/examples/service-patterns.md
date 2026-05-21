# Frontend Service Patterns

Canonical examples for Zustand store slices and selectors.

---

## Zustand Store Slice

```typescript
// frontend/src/store/slices/user/index.ts
import { StateCreator } from 'zustand';
import { Store } from '../../store.types';
import { UserStore } from '../user/user.types';
import initUser from './user.state';
import { UserSlice } from './user.types';

export const createUserSlice: StateCreator<Store, [], [], UserSlice> = set => ({
    ...initUser,
    changeUser: (user: UserStore) => set(() => user),
    clearUser: () => set(() => initUser),
});
```

Initial state shape (`user.state.ts`):

```typescript
const user = {
    accessToken: null,
    firstName: null,
    lastName: null,
    email: null,
    id: null,
};

export default user;
```

Rules:
- Initial state lives in `<name>.state.ts`.
- Slice type and action signatures live in `<name>.types.ts`.
- DO NOT call API functions from within slices.
- Expose state via selectors in `store/selectors/<name>/`.

---

## Selector Hook

```typescript
// frontend/src/store/selectors/user/index.ts
import { useStore } from '@/store';

export const useUserSelection = () => {
    const accessToken = useStore(state => state.accessToken);
    const firstName = useStore(state => state.firstName);
    const changeUser = useStore(state => state.changeUser);
    const clearUser = useStore(state => state.clearUser);

    return { accessToken, firstName, changeUser, clearUser };
};
```

Usage in components:

```typescript
const { accessToken, changeUser, clearUser } = useUserSelection();
```
