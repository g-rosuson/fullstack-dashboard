---
name: react-form-patterns
description: Implement controlled React forms using the single-state-object pattern, Field components, Zod validation, and the try/catch/finally loading state convention. Covers onInputChange, onSubmit, isLoading lifecycle, CustomError issue surfacing, and password validation. Use when building any form that submits to the API.
---

# Purpose

Implement forms consistently — controlled inputs with a single state object, API submission with correct loading lifecycle, and structured error handling using `CustomError`.

# When To Use

- Building a new form that calls the API.
- Adding fields to an existing form.
- Debugging form submission that leaves `isLoading` stuck on, or swallows errors.

# Required Patterns

## Single state object

All form field values and UI flags live in one `useState` object:

```typescript
const [state, setState] = useState({
    email: '',
    password: '',
    isLoading: false,
});

const { email, password, isLoading } = state;
```

Do not use multiple `useState` calls for individual fields.

## Controlled input handler

```typescript
const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setState(prevState => ({
        ...prevState,
        [name]: value,
    }));
};
```

Input elements MUST have a `name` attribute matching the state key.

## Submit handler — try/catch/finally

```typescript
const onSubmit = async (event: FormEvent) => {
    try {
        event.preventDefault();
        setState(prev => ({ ...prev, isLoading: true }));

        const payload: SomeInputType = { email, password };
        const response = await api.service.resources.someResource.action(payload);

        // handle success (update store, navigate, etc.)
    } catch (error) {
        if (error instanceof CustomError) {
            // surface error.issues for field-level errors
        }
        logging.error(error as Error);
    } finally {
        setState(prev => ({ ...prev, isLoading: false }));
    }
};
```

Rules:
- `isLoading: true` set at the start of `try`, **before** the `await`.
- `isLoading: false` set in `finally` only — never in both `try` and `catch`.
- `event.preventDefault()` called before any async work.

## Field component

Use `Field` from `@/components/ui-app/field/Field`. Never use raw `<input>` in page forms.

```tsx
<Field
    label="Email"
    type="email"
    name="email"
    value={email}
    placeholder="you@example.com"
    onChange={onInputChange}
    required
/>
```

## Button with loading state

Use `Button` from `@/components/ui-app/button/Button`:

```tsx
<Button
    type="submit"
    label="Sign in"
    isLoading={isLoading}
    disabled={isLoading}
/>
```

## Zod validation for client-side checks

Use `schema.safeParse(value)` for runtime validation (e.g. JWT payload shape). Do not write custom imperative validation logic.

```typescript
const parsed = jwtPayloadSchema.safeParse(decoded);

if (!parsed.success) {
    // handle invalid shape
}
```

## Form element

Wrap inputs in `<form onSubmit={onSubmit}>`. Add `aria-label` for accessibility.

```tsx
<form aria-label="Authentication form" className="flex flex-col gap-3" onSubmit={onSubmit}>
    {/* fields */}
    <Button type="submit" label="Submit" isLoading={isLoading} />
</form>
```

# Implementation Steps

## Building a new form

1. Define the state type and initial value with all fields + `isLoading: false`.
2. Implement `onInputChange` using the spread pattern.
3. Implement `onSubmit` with `try/catch/finally` and `event.preventDefault()`.
4. In `try`: set `isLoading: true`, call the API resource function, handle the success response.
5. In `catch`: check `instanceof CustomError` for issues; call `logging.error`.
6. In `finally`: set `isLoading: false`.
7. Render `<form>` with `Field` components and a `Button` that receives `isLoading`.
8. Import types from `@/_types/_gen` — never define API payload types manually.

# Examples

## Authentication form — complete pattern

```typescript
const [state, setState] = useState({
    email: '',
    password: '',
    isLoading: false,
});

const { email, password, isLoading } = state;

const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState(prev => ({ ...prev, [name]: value }));
};

const onSubmit = async (event: FormEvent) => {
    try {
        event.preventDefault();
        setState(prev => ({ ...prev, isLoading: true }));

        const payload: LoginUserInput = { email, password };
        const response = await api.service.resources.authentication.login(payload);

        const decoded = utils.jwt.decode(response.data);
        const parsed = jwtPayloadSchema.safeParse(decoded);

        if (!parsed.success) {
            userSelectors.clearUser();
            navigate(config.routes.login);
            return;
        }

        userSelectors.changeUser({ accessToken: response.data, ...parsed.data });

    } catch (error) {
        if (error instanceof CustomError) {
            // surface error.issues
        }
        logging.error(error as Error);
    } finally {
        setState(prev => ({ ...prev, isLoading: false }));
    }
};
```

## State update for a stable callback (useCallback)

When a child component needs a callback that should not change on every render:

```typescript
const onPasswordChange = useCallback((isPasswordValid: boolean) => {
    setState(prev => ({ ...prev, isPasswordValid }));
}, []);
```

# Edge Cases

- **Navigate after successful submit**: Call `navigate(...)` inside `try` before `return`. The `finally` block still runs (clears `isLoading`) even when `return` is hit.
- **Conditional form fields**: Derive a flag from `useLocation()` or props to conditionally render register-only fields. Keep the full state object regardless — unused fields remain empty strings.
- **Disabled submit on invalid state**: Pass `disabled={isRegisterActive && !isPasswordValid}` to `Button` rather than guarding inside `onSubmit`.

# Anti-Patterns

- **Never** use multiple `useState` calls for individual form fields — use a single state object.
- **Never** set `isLoading: false` in both `try` success and `catch` — use `finally` only.
- **Never** call `event.preventDefault()` after an `await` — the form submits before the handler resumes.
- **Never** use raw `<input>` elements in page forms — use the `Field` ui-app component.
- **Never** import from `src/components/ui/` directly — use `ui-app/` wrappers.
- **Never** define API payload types manually — import from `@/_types/_gen`.
- **Never** swallow errors with an empty `catch` block.
- **Never** use `fetch` directly in components — use `api.service.resources.*`.

# Validation Checklist

- [ ] Single `useState` object for all form fields and flags
- [ ] `onInputChange` uses spread update with `[event.target.name]`
- [ ] `event.preventDefault()` called before any await
- [ ] `isLoading: true` set before the API call
- [ ] `isLoading: false` cleared only in `finally`
- [ ] `CustomError` checked with `instanceof` before accessing `.issues`
- [ ] `logging.error` called in `catch`
- [ ] `Field` and `Button` ui-app components used
- [ ] API payload types imported from `@/_types/_gen`
- [ ] `@/` path alias used — no `../../` relative imports
