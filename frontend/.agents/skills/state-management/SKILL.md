---
name: state-management
description: Add Zustand state slices, selectors, and actions following the repository's composed-slice pattern. Covers slice file structure (state, types, index), selector hooks, Store type composition, and the rule against API calls inside slices. Use when adding new global state, extending an existing slice, or adding selector hooks.
---

# Purpose

Implement global state correctly — composed Zustand slices with co-located types, selector hooks consumed by components, and no API calls inside slices.

# When To Use

- Adding a new slice of global state (e.g. `notifications`, `jobs`).
- Adding a new field or action to an existing slice (`user`, `ui`).
- Adding a new selector hook for a component to consume.
- Debugging stale state or improper store access in components.

# Required Patterns

## Slice structure

Each slice lives at `store/slices/<name>/` with three files:

```
store/slices/<name>/
├── <name>.state.ts   Initial state value
├── <name>.types.ts   Slice type (state shape + action signatures)
└── index.ts          StateCreator implementation
```

## `<name>.types.ts` — define state shape and actions

```typescript
export type UserStore = {
    accessToken: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    id: string | null;
};

export type UserSlice = UserStore & {
    changeUser: (user: UserStore) => void;
    clearUser: () => void;
};
```

## `<name>.state.ts` — initial state

```typescript
import type { UserStore } from './user.types';

const initUser: UserStore = {
    accessToken: null,
    firstName: null,
    lastName: null,
    email: null,
    id: null,
};

export default initUser;
```

## `index.ts` — StateCreator

```typescript
import { StateCreator } from 'zustand';
import { Store } from '../../store.types';
import { UserStore, UserSlice } from './user.types';
import initUser from './user.state';

export const createUserSlice: StateCreator<Store, [], [], UserSlice> = set => ({
    ...initUser,
    changeUser: (user: UserStore) => set(() => user),
    clearUser: () => set(() => initUser),
});
```

## Store composition — `store/store.types.ts` and `store/index.ts`

Add new slices to the `Store` type and the `create` call:

```typescript
// store.types.ts
import { UserSlice } from './slices/user/user.types';
import { UiSlice } from './slices/ui/ui.types';
import { NewSlice } from './slices/new/new.types';

export type Store = UserSlice & UiSlice & NewSlice;
```

```typescript
// store/index.ts
export const useStore = create<Store>()(
    devtools((set, get, store) => ({
        ...createUserSlice(set, get, store),
        ...createUiSlice(set, get, store),
        ...createNewSlice(set, get, store),
    }))
);
```

## Selector hooks — `store/selectors/<name>/index.ts`

Each slice has a co-located selector hook. Components ONLY access the store through these hooks.

```typescript
import { useStore } from '@/store';

export const useUserSelection = () => ({
    accessToken: useStore(store => store.accessToken),
    firstName: useStore(store => store.firstName),
    lastName: useStore(store => store.lastName),
    email: useStore(store => store.email),
    id: useStore(store => store.id),
    changeUser: useStore(store => store.changeUser),
    clearUser: useStore(store => store.clearUser),
});
```

## Consuming in components

```typescript
import { useUserSelection } from '@/store/selectors/user';

const MyComponent = () => {
    const userSelectors = useUserSelection();

    // Read state
    const { accessToken, email } = userSelectors;

    // Call actions
    userSelectors.changeUser({ accessToken: newToken, ... });
    userSelectors.clearUser();
};
```

**Never** call `useStore(...)` directly in components — always use selector hooks.
**Never** call `useStore.getState()` inside components — that is only for non-React contexts (`rest.ts`).

# Implementation Steps

## Adding a new slice

1. Create `store/slices/<name>/` with the three files.
2. Define state shape and actions in `<name>.types.ts`.
3. Define the initial state in `<name>.state.ts`.
4. Implement the `StateCreator` in `index.ts`.
5. Add the slice type to `Store` in `store/store.types.ts`.
6. Spread the slice creator into the `create` call in `store/index.ts`.
7. Create `store/selectors/<name>/index.ts` with a `use<Name>Selection` hook.

## Adding a field to an existing slice

1. Add the field to `<name>.types.ts` (both `<Name>Store` and `<Name>Slice`).
2. Add the initial value to `<name>.state.ts`.
3. Add the setter action to `index.ts` if needed.
4. Add the field to the selector hook in `store/selectors/<name>/index.ts`.

# Examples

## Minimal new slice — notifications

```typescript
// store/slices/notifications/notifications.types.ts
export type NotificationStore = {
    messages: string[];
};

export type NotificationSlice = NotificationStore & {
    addMessage: (msg: string) => void;
    clearMessages: () => void;
};

// store/slices/notifications/notifications.state.ts
import type { NotificationStore } from './notifications.types';
const initNotifications: NotificationStore = { messages: [] };
export default initNotifications;

// store/slices/notifications/index.ts
import { StateCreator } from 'zustand';
import { Store } from '../../store.types';
import { NotificationSlice } from './notifications.types';
import initNotifications from './notifications.state';

export const createNotificationSlice: StateCreator<Store, [], [], NotificationSlice> = set => ({
    ...initNotifications,
    addMessage: (msg) => set(state => ({ messages: [...state.messages, msg] })),
    clearMessages: () => set(() => initNotifications),
});

// store/selectors/notifications/index.ts
import { useStore } from '@/store';

export const useNotificationSelection = () => ({
    messages: useStore(store => store.messages),
    addMessage: useStore(store => store.addMessage),
    clearMessages: useStore(store => store.clearMessages),
});
```

# Edge Cases

- **Partial state updates with actions**: Use `set(state => ({ ...state.nestedField, newValue }))` when the action updates only a subset of slice fields. Avoid `set(() => entireNewState)` unless resetting to the initial value.
- **Reading state outside React (non-hook context)**: Use `useStore.getState().fieldName` only in non-React files like `rest.ts`. This bypasses reactivity — do not use it inside components or hooks.
- **Devtools naming**: Zustand devtools will name slices by action string. Use descriptive action names so Redux DevTools labels are readable.

# Anti-Patterns

- **Never** call API functions inside slice actions — `changeUser` only calls `set()`.
- **Never** call `useStore(...)` directly in components — use the `use<Name>Selection()` selector hook.
- **Never** call `useStore.getState()` inside components — it bypasses React reactivity and won't trigger re-renders.
- **Never** add fields to `Store` without updating the corresponding slice type and initial state.
- **Never** put UI-only transient state (e.g. modal open/close) in the same slice as persistent domain state — use the `ui` slice for UI flags.

# Validation Checklist

- [ ] Three slice files created: `<name>.state.ts`, `<name>.types.ts`, `index.ts`
- [ ] State shape type and action type defined separately and combined in `<Name>Slice`
- [ ] Initial state exported from `<name>.state.ts`
- [ ] `StateCreator<Store, [], [], <Name>Slice>` typing used
- [ ] Slice added to `Store` in `store.types.ts`
- [ ] Slice creator spread into `store/index.ts`
- [ ] Selector hook created in `store/selectors/<name>/index.ts`
- [ ] Components consume state via `use<Name>Selection()` — no direct `useStore` calls
- [ ] No API calls inside slice actions
