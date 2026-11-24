# TKT-UI-006 — Icon size scale

`chore/tkt-ui-006-icon-size-scale`

Labels: `chore`

## User story

As a frontend contributor, I want icon glyphs on a named `xs`–`xl` scale separate from spacing so that icon sizes step tightly and stay consistent across controls.

## Definition of done

- [ ] Emitted `@theme` tokens in `frontend/src/stylesheets/global.css`: `--icon-size-xs` `0.75rem`, `--icon-size-sm` `0.875rem`, `--icon-size-md` `1rem`, `--icon-size-lg` `1.25rem`, `--icon-size-xl` `1.5rem`. They are not `--spacing-*` tokens. `size-xs` / `size-sm` / `size-md` / `size-lg` keep meaning spacing
- [ ] Design-system docs (`frontend/src/stylesheets/docs/`) describe the scale, why it is separate from spacing and type, and the consumption form `size-(--icon-size-sm)`
- [ ] Each button `size` sets one icon utility, and the base class sets none: `xs` / `icon-xs` → `xs`, `sm` / `icon-sm` → `sm`, `default` / `md` / `icon` → `md`, `lg` / `icon-lg` → `lg`. An SVG that brings its own `size-*` class still opts out. Button hit targets (`h-*`, `size-8`, …) stay as they are
- [ ] Spinner `xs`–`lg` use the same tokens. Tests that assert `size-sm` (and the other spacing size classes) update with that change
- [ ] Other icon glyphs in `components/ui` and `components/blocks` that set a numbered `size-*` or a Lucide `size={n}` snap to the nearest token (dropdown menus, tabs, input group, sidebar item icons, calendar chevrons, select chevron, item icon, toast icon, avatar person icon). Glyphs larger than `xl` stay on a spacing size, with a comment. Status dots, skeletons, avatar frames, radio marks, and tooltip arrows stay on spacing

## Traces

None — shared UI infrastructure; product flows keep their own FR/CLIENT traces.
