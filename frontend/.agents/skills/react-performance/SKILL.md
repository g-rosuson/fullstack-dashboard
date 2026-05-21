---
name: react-performance
description: React performance optimization rules for this Vite + React 19 SPA. Covers async waterfall elimination, bundle size, re-render reduction, rendering efficiency, and JavaScript patterns. Use when writing, reviewing, or refactoring React components, implementing async data fetching, or investigating render performance.
license: MIT
metadata:
  version: "1.0.0"
---

# React Performance

Performance optimization rules for React 19 in a client-side SPA. Rules are ordered by impact.

> Next.js-specific rules (RSC, server components, SSR hydration) are excluded — this app is a Vite SPA.

---

## 1. Eliminating Async Waterfalls — CRITICAL

### `async-parallel` — Use `Promise.all` for independent operations

When async operations have no interdependencies, run them concurrently.

```typescript
// ❌ Sequential — 3 round trips
const user = await fetchUser();
const jobs = await fetchJobs();
const settings = await fetchSettings();

// ✅ Parallel — 1 round trip
const [user, jobs, settings] = await Promise.all([
    fetchUser(),
    fetchJobs(),
    fetchSettings(),
]);
```

### `async-defer-await` — Move `await` into the branch that needs it

```typescript
// ❌ Always fetches even when skipping
async function handleRequest(id: string, skip: boolean) {
    const data = await fetchData(id);
    if (skip) return { skipped: true };
    return process(data);
}

// ✅ Fetches only when needed
async function handleRequest(id: string, skip: boolean) {
    if (skip) return { skipped: true };
    const data = await fetchData(id);
    return process(data);
}
```

### `async-cheap-condition-before-await` — Check sync guards before async calls

```typescript
// ❌ Fetches permissions even for invalid IDs
async function deleteJob(id: string) {
    const permissions = await fetchPermissions();
    if (!id) throw new Error('Invalid ID');
    return performDelete(id, permissions);
}

// ✅ Cheap guard first
async function deleteJob(id: string) {
    if (!id) throw new Error('Invalid ID');
    const permissions = await fetchPermissions();
    return performDelete(id, permissions);
}
```

---

## 2. Bundle Size — CRITICAL

### `bundle-barrel-imports` — Import directly, avoid barrel files

Barrel files (`index.ts` with `export *`) load every re-export. For large icon/component libraries this adds 200–800ms on cold start.

```typescript
// ❌ Loads all 1,583 lucide icons
import { Check, X, Menu } from 'lucide-react';

// ✅ Loads only the three icons used
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Menu from 'lucide-react/dist/esm/icons/menu';
```

> **TypeScript note**: some libraries (including `lucide-react`) don't ship `.d.ts` for deep paths. Verify the library exports types at the subpath; if not, prefer named imports at the top level and rely on Vite's tree-shaking.

Libraries to watch: `lucide-react`, `@radix-ui/react-*`, `date-fns`, `@tanstack/react-table`.

### `bundle-conditional` — Load modules only when the feature is activated

```typescript
// ❌ Chart library loaded on every page
import { Chart } from 'heavy-chart-lib';

// ✅ Loaded only when needed
const { Chart } = await import('heavy-chart-lib');
```

Use `React.lazy` + `Suspense` for component-level code splitting:

```tsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

<Suspense fallback={<Skeleton />}>
    <HeavyChart data={data} />
</Suspense>
```

### `bundle-defer-third-party` — Load analytics/logging after hydration

```typescript
// ❌ Blocks initial render
import analytics from 'analytics-lib';
analytics.init();

// ✅ Deferred until idle
useEffect(() => {
    import('analytics-lib').then(({ default: analytics }) => analytics.init());
}, []);
```

### `bundle-preload` — Preload on hover/focus for perceived speed

```tsx
const prefetchJobDetails = () => import('./JobDetails');

<button
    onMouseEnter={prefetchJobDetails}
    onFocus={prefetchJobDetails}
    onClick={openJobDetails}
>
    View details
</button>
```

---

## 3. Re-render Optimization — MEDIUM

### `rerender-no-inline-components` — Never define components inside components — HIGH impact

Defining a component inside another creates a new component type on every render, causing React to unmount and remount it. Symptoms: inputs lose focus on keystrokes, effects re-run, animations restart.

```tsx
// ❌ Avatar is a new type on every render — remounts every time
function JobCard({ job, theme }) {
    const Badge = () => <span className={theme}>{job.status}</span>;
    return <div><Badge /></div>;
}

// ✅ Define outside, pass props
function Badge({ status, theme }: { status: string; theme: string }) {
    return <span className={theme}>{status}</span>;
}
function JobCard({ job, theme }) {
    return <div><Badge status={job.status} theme={theme} /></div>;
}
```

### `rerender-derived-state-no-effect` — Derive values during render, not in effects

```tsx
// ❌ Extra render cycle for derived state
const [fullName, setFullName] = useState('');
useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Compute directly during render
const fullName = `${firstName} ${lastName}`;
```

### `rerender-functional-setstate` — Use functional updates to avoid stale closures

```tsx
// ❌ Requires items as dependency; creates a new callback on every change
const addItem = useCallback((item: Item) => {
    setItems([...items, item]);
}, [items]);

// ✅ Stable reference; no stale closure risk
const addItem = useCallback((item: Item) => {
    setItems(curr => [...curr, item]);
}, []);
```

### `rerender-memo` — Extract expensive work into memoized components

```tsx
// ❌ Computes avatar even when loading is true
function Profile({ user, loading }) {
    const avatar = useMemo(() => computeAvatar(user), [user]);
    if (loading) return <Skeleton />;
    return <div>{avatar}</div>;
}

// ✅ Skips computation entirely when loading
const UserAvatar = memo(function UserAvatar({ user }) {
    const avatar = useMemo(() => computeAvatar(user), [user]);
    return <div>{avatar}</div>;
});
function Profile({ user, loading }) {
    if (loading) return <Skeleton />;
    return <UserAvatar user={user} />;
}
```

### `rerender-use-ref-transient-values` — Use `useRef` for values that update frequently without needing a render

```tsx
// ❌ Re-renders on every mouse move
const [mouseX, setMouseX] = useState(0);

// ✅ No re-render; mutate the DOM directly via the ref
const mouseXRef = useRef(0);
const dotRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    const onMove = (e: MouseEvent) => {
        mouseXRef.current = e.clientX;
        if (dotRef.current) dotRef.current.style.transform = `translateX(${e.clientX}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
}, []);
```

### `rerender-transitions` — Mark non-urgent updates with `startTransition`

```tsx
import { startTransition } from 'react';

// ❌ Blocks input on every keystroke
const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setResults(filterJobs(jobs, e.target.value)); // expensive
};

// ✅ Input stays responsive; results update when idle
const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    startTransition(() => setResults(filterJobs(jobs, e.target.value)));
};
```

### `rerender-defer-reads` — Don't subscribe to state only used inside callbacks

```tsx
// ❌ Re-renders every time searchParams changes
function ShareButton({ jobId }) {
    const [searchParams] = useSearchParams();
    const handleShare = () => {
        const ref = searchParams.get('ref');
        shareJob(jobId, ref);
    };
    return <button onClick={handleShare}>Share</button>;
}

// ✅ Reads on demand, no subscription
function ShareButton({ jobId }) {
    const handleShare = () => {
        const ref = new URLSearchParams(window.location.search).get('ref');
        shareJob(jobId, ref);
    };
    return <button onClick={handleShare}>Share</button>;
}
```

### `rerender-memo-with-default-value` — Hoist non-primitive default props

```tsx
// ❌ New array reference on every render → child always re-renders
function JobList({ jobs = [] }) { ... }

// ✅ Stable reference
const EMPTY_JOBS: Job[] = [];
function JobList({ jobs = EMPTY_JOBS }) { ... }
```

### `rerender-dependencies` — Use primitive dependencies in effects

```tsx
// ❌ Object reference changes on every render
useEffect(() => { loadJob(job); }, [job]);

// ✅ Stable primitive dependency
useEffect(() => { loadJob(job.id); }, [job.id]);
```

### `rerender-move-effect-to-event` — Put interaction logic in event handlers, not effects

```tsx
// ❌ Unnecessary round-trip through state
const [shouldSubmit, setShouldSubmit] = useState(false);
useEffect(() => { if (shouldSubmit) { submitForm(); setShouldSubmit(false); } }, [shouldSubmit]);

// ✅ Direct
const handleSubmit = () => submitForm();
```

---

## 4. Rendering Performance — MEDIUM

### `rendering-conditional-render` — Use ternary, not `&&`, for numeric conditions

```tsx
// ❌ Renders "0" when count is 0
{count && <Badge count={count} />}

// ✅ Renders nothing
{count > 0 ? <Badge count={count} /> : null}
```

### `rendering-hoist-jsx` — Extract static JSX outside components

```tsx
// ❌ New object reference each render
function Sidebar() {
    const emptyState = <p className="text-muted">No jobs yet.</p>;
    return <div>{jobs.length === 0 ? emptyState : <JobList />}</div>;
}

// ✅ Defined once at module level
const EMPTY_STATE = <p className="text-muted">No jobs yet.</p>;
function Sidebar() {
    return <div>{jobs.length === 0 ? EMPTY_STATE : <JobList />}</div>;
}
```

### `rendering-content-visibility` — Use `content-visibility` for long lists

```css
/* Skips rendering off-screen items */
.job-row {
    content-visibility: auto;
    contain-intrinsic-size: 0 48px; /* estimated row height */
}
```

### `rendering-usetransition-loading` — Prefer `useTransition` over `isLoading` state for navigation

```tsx
// ✅ Built-in pending state with no extra useState
const [isPending, startTransition] = useTransition();

const navigate = (route: string) => {
    startTransition(() => setCurrentRoute(route));
};

<Button isLoading={isPending} onClick={() => navigate('/jobs')} />
```

---

## 5. JavaScript Performance — LOW-MEDIUM

### `js-set-map-lookups` — Use `Set`/`Map` for repeated membership checks

```typescript
// ❌ O(n) per check
const allowedIds = ['a', 'b', 'c'];
items.filter(item => allowedIds.includes(item.id));

// ✅ O(1) per check
const allowedIds = new Set(['a', 'b', 'c']);
items.filter(item => allowedIds.has(item.id));
```

### `js-index-maps` — Build a Map for repeated lookups

```typescript
// ❌ O(n) on every access
const getJob = (id: string) => jobs.find(j => j.id === id);

// ✅ O(1) — build once, look up repeatedly
const jobIndex = new Map(jobs.map(j => [j.id, j]));
const getJob = (id: string) => jobIndex.get(id);
```

### `js-combine-iterations` — Combine filter + map into one loop

```typescript
// ❌ Two passes
const results = items.filter(isActive).map(transform);
// ✅ One pass
const results = items.flatMap(item => isActive(item) ? [transform(item)] : []);
```

### `js-early-exit` — Return early from functions

```typescript
// ❌ Nested conditions
function process(item: Item | null) { if (item) { if (item.isValid) { return transform(item); } } }

// ✅ Flat
function process(item: Item | null) {
    if (!item) return;
    if (!item.isValid) return;
    return transform(item);
}
```

### `js-tosorted-immutable` — Use `toSorted()` for immutable sort

```typescript
// ❌ Mutates the original array
const sorted = jobs.sort((a, b) => a.name.localeCompare(b.name));

// ✅ Returns a new array
const sorted = jobs.toSorted((a, b) => a.name.localeCompare(b.name));
```

### `js-hoist-regexp` — Hoist RegExp outside loops

```typescript
// ❌ New RegExp on every iteration
items.filter(item => /active/i.test(item.status));

// ✅ Compiled once
const ACTIVE_RE = /active/i;
items.filter(item => ACTIVE_RE.test(item.status));
```

---

## 6. Advanced Patterns — LOW

### `advanced-use-latest` — useLatest for stable callback refs

Avoid stale closures in long-lived callbacks (e.g. event listeners, SSE handlers) by keeping a ref to the latest version:

```typescript
function useLatest<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

// Usage: stable listener that always sees current props
const onEventRef = useLatest(onEvent);

useEffect(() => {
    const handler = (e: Event) => onEventRef.current(e);
    emitter.on('job-update', handler);
    return () => emitter.off('job-update', handler);
}, []); // empty deps — handler never changes
```

### `advanced-event-handler-refs` — Store event handlers in refs

```tsx
// ✅ Child receives a stable ref; never re-renders due to handler changes
function Parent() {
    const [count, setCount] = useState(0);
    const handleClickRef = useRef(() => setCount(c => c + 1));

    return <ExpensiveChild onClick={handleClickRef} />;
}
```

### `advanced-init-once` — Initialize expensive singletons once per app load

```typescript
// ❌ Re-initializes on every render
function App() {
    const store = createStore();
    ...
}

// ✅ Initialized at module level
const store = createStore();
function App() { ... }
```

---

## Validation Checklist

- [ ] Independent async calls use `Promise.all`
- [ ] `await` deferred to the branch that needs it
- [ ] No components defined inside other components
- [ ] Derived values computed during render, not in effects
- [ ] `setState` inside `useCallback` uses functional update form
- [ ] Expensive components wrapped in `memo`; static JSX hoisted to module level
- [ ] Numeric conditions use ternary (`count > 0 ? ... : null`), not `&&`
- [ ] Repeated array lookups converted to `Set`/`Map`
- [ ] Arrays sorted with `toSorted()` (immutable)
- [ ] RegExp literals hoisted outside loops
- [ ] Non-primitive default props hoisted to module-level constants
- [ ] High-frequency state (mouse, scroll) stored in `useRef` with direct DOM mutation
- [ ] Non-urgent state updates wrapped in `startTransition`
- [ ] Event listener callbacks use `useLatest` to avoid stale closures
