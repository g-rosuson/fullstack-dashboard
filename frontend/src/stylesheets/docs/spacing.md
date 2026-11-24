# Semantic spacing scale

Layout spacing (padding, margin, gap) uses named tokens derived from one `--spacing` primitive. Change that primitive and both numbered utilities (`p-1`, `gap-4`) and named utilities (`p-xs`, `gap-md`) move together.

## Primitive and tokens

`--spacing` is `0.25rem` in `@theme inline` (`global.css`) and named tokens are multipliers of that value.

`--spacing-{name}` registers the token on Tailwind’s spacing scale, so every spacing family gets a class: `p-sm`, `px-md`, `m-lg`, `mt-xs`, `gap-xl`, `space-y-sm`, `inset-md`, and the rest.

## What to use

Prefer `xs`–`xl` in app components (`blocks`, pages, layout). Pick the step that matches the relationship, not a pixel target:

- `xs` — tight: icon-to-label, stacked meta
- `sm` — default between related items
- `md` — section padding, card/sheet inset, medium stacks
- `lg` — between distinct blocks (sheet footer offset)
- `xl` — page-level separation

Numbered utilities (`p-1`, `gap-3`) still exist because they also read `--spacing`. Do not use them in app components (`blocks`, pages, layout) — snap to the nearest named token. Arbitrary values (`p-[13px]`) only when a concrete design requirement cannot use a token. `p-0` / `m-0` / `gap-0` are fine for “none”.

Icon glyphs do not use this scale. `size-sm` is spacing (`0.5rem`); a small icon is `size-(--icon-size-sm)`. See [icon-size.md](./icon-size.md).

On shadcn primitives under `components/ui/`, swap numbered spacing that matches the scale (`2` → `sm`, `4` → `md`) and comment the line. Apply named tokens on the composed block surface.
