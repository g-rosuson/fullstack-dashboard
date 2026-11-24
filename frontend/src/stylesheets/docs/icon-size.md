# Icon size scale

Icon glyphs use their own `xs`–`xl` ramp. Spacing steps (`3px`, `8px`, `16px`, `24px`, `32px`) are too coarse for a glyph, and the type ramp starts too small for a stroked icon (`--text-xs` is `0.6rem`).

## Tokens

Emitted from `@theme` in `global.css`. They are not `--spacing-*` tokens, so `size-xs` / `size-sm` / `size-md` / `size-lg` still mean spacing.

- `--icon-size-xs` — `0.75rem`
- `--icon-size-sm` — `0.875rem`
- `--icon-size-md` — `1rem`
- `--icon-size-lg` — `1.25rem`
- `--icon-size-xl` — `1.5rem`

## What to use

Set the glyph with the spacing utility pointed at the token: `size-(--icon-size-sm)`.

One icon utility per element. A second `size-*` on the same selector does not override the first — Tailwind keeps both and the later rule in the stylesheet wins.

An SVG that brings its own `size-*` class opts out of a parent rule written as `[&_svg:not([class*='size-'])]:size-(--icon-size-md)`.

Glyphs larger than `xl` stay on a spacing size, with a comment. Status dots, skeletons, avatar frames, radio marks, and tooltip arrows stay on spacing. See [spacing.md](./spacing.md).
