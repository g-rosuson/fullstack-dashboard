# How `@theme` tokens become classes

The **prefix** on a `@theme` variable is the contract. Tailwind only generates classes from prefixes it knows:

`--color-*`, `--text-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--animate-*`, `--spacing`, `--spacing-*`

The rest of the name is what you type in a component: `--color-primary` → `bg-primary`.

Two things that are easy to mix up:

**`--color-*` fans out.** One color token becomes many classes (`bg-primary`, `text-primary`, `border-primary`, `ring-primary`, …). Other prefixes map to one class family, and the class name is not always the prefix: `--radius-lg` → `rounded-lg`, not `radius-lg`.

**`text-*` is two namespaces.** `text-sm` is font size (`--text-sm`). `text-muted-foreground` is color (`--color-muted-foreground`).

## Spacing is two knobs

`--spacing` is the step for numbered classes: `p-1` is one step, `p-4` is four. Change it and `p-1` / `p-4` / `gap-2` all move.

`--spacing-sm` (and `xs` / `md` / `lg` / `xl`) generates named classes: `p-sm`, `m-sm`, `gap-sm`, …

App layout uses the named scale. See [spacing.md](./spacing.md).

## Icon size is a third knob

`--icon-size-sm` (and `xs` / `md` / `lg` / `xl`) is a glyph length. It is not a Tailwind namespace, so it does not generate `size-sm`. Consume it as `size-(--icon-size-sm)`. `size-sm` stays `var(--spacing-sm)`.

See [icon-size.md](./icon-size.md).

Tokens: `global.css`. Spacing and icon size are in the emitted `@theme` block. Color and type tokens are `@theme inline`.
