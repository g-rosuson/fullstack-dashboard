# Light and dark mode

Two mechanisms work together: **CSS variables** (default theming) and the **`dark` class** (activation + optional overrides).

## CSS — token values

Light mode values live on `:root`. Dark mode overrides the same `--*` variables on `.dark`:

`@theme inline` registers `--color-background: var(--background)` etc. Utilities like `bg-background` always read the current value — no duplicate light/dark classes needed for semantic tokens.

## Tailwind `dark:` variant

```css
@custom-variant dark (&:is(.dark *));
```

`dark:` applies to elements inside an ancestor with class `dark` (typically `<html class="dark">`). Use for styles that cannot be expressed as a shared token, e.g. `dark:bg-input/30`.

## Runtime — who toggles `.dark`

| Step | Where | What happens |
| --- | --- | --- |
| **Boot** | `AppSetup.tsx` | Read `localStorage` theme → else `prefers-color-scheme` → set `document.documentElement.classList.toggle('dark', …)` and sync Zustand store |
| **Toggle** | `TopBar.tsx` | User clicks theme button → update store → `storage.ui.theme.setTheme()` → toggle `.dark` on `<html>` |
| **Persist** | `services/storage` | `localStorage` key `theme`: `"light"` \| `"dark"` |

Flow:

```
User / system preference
        ↓
  theme = 'light' | 'dark'  (Zustand + localStorage)
        ↓
  <html class="dark">?      (class on documentElement)
        ↓
  .dark { --background: … } overrides :root
        ↓
  bg-background, text-foreground, … update automatically
```

Default store value is `'dark'` (`store/slices/ui`); on first visit without saved preference, `AppSetup` uses system preference instead.

## What to use in components

| Approach | When |
| --- | --- |
| Semantic utilities (`bg-background`, `text-muted-foreground`, `border-border`) | Default — works in both modes via CSS vars |
| `dark:…` variant | Extra tweak per mode when one token is not enough |

Add or change a color for both modes in `global.css` (`:root` + `.dark`), not in every component.
