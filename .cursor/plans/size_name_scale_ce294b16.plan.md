---
name: Size name scale
overview: Introduce one ordered size scale and derive every prefix-based class map and prop union from it. Lengths stay in CSS. Text and title class choices stay written out.
todos:
    - id: add-scale
      content: Add the ordered size scale, slice type, and tokens helper under frontend/src/utils/size
      status: pending
    - id: spacing-lookup
      content: Build the spacing CSS-variable map from the helper and remove the TODO
      status: pending
    - id: prefix-maps
      content: Replace prefix-only class maps in Flex, Grid, Card, typography spacing, Sheet, Dialog, and Spinner
      status: pending
    - id: prop-slices
      content: Replace handwritten size unions with slices of the scale, including Status and Schedule
      status: pending
    - id: semantic-maps
      content: Type text and title class maps against their slice; leave ui/ and CSS lengths alone
      status: pending
    - id: verify
      content: Add a tokens unit test and run the existing block tests that assert these class names
      status: pending
isProject: false
---

# Close over size names

Lengths stay in [`frontend/src/stylesheets/global.css`](frontend/src/stylesheets/global.css). TypeScript only owns the names `xs` through `xl`. Class strings that callers and tests already expect (`gap-md`, `min-w-sm`, `sm:max-w-lg`) do not change.

## 1. Add the scale

Add [`frontend/src/utils/size/index.ts`](frontend/src/utils/size/index.ts) and export it from [`frontend/src/utils/index.ts`](frontend/src/utils/index.ts).

- An ordered list: `xs`, `sm`, `md`, `lg`, `xl`.
- A slice type so a prop can be “from `xs` to `lg`” or “from `sm` to `xl`” without rewriting the union.
- A `tokens(prefix, slice)` helper that builds the map. `tokens('gap', full)` returns `{ xs: 'gap-xs', ... }`. `tokens('sm:max-w', from sm)` returns `{ sm: 'sm:max-w-sm', ... }`.

## 2. Switch the spacing lookup

In [`frontend/src/utils/spacing/index.ts`](frontend/src/utils/spacing/index.ts), build the `--spacing-*` map with that helper and delete the TODO. `measure` still reads the computed CSS variable. It does not copy the rem values.

## 3. Replace prefix-only class maps

Use `tokens` anywhere the value is only a prefix plus the size name:

- [`Flex.tsx`](frontend/src/components/blocks/flex/Flex.tsx) gap (`gap-`)
- [`Grid.tsx`](frontend/src/components/blocks/grid/Grid.tsx) gap (`gap-`) and autofill columns (`grid-cols-autofill-`)
- [`Card.tsx`](frontend/src/components/blocks/card/Card.tsx) min-width (`min-w-`)
- [`spacing.ts`](frontend/src/components/blocks/shared/variants/typography/spacing.ts) margins (`mb-`). Keep the extra `none: 'mb-0'` key beside the generated map.
- [`Sheet.tsx`](frontend/src/components/blocks/sheet/Sheet.tsx) and [`Dialog.tsx`](frontend/src/components/blocks/dialog/Dialog.tsx) width (`sm:max-w-`)
- [`Spinner.tsx`](frontend/src/components/blocks/spinner/Spinner.tsx) size (`size-`)

## 4. Replace copied unions with a slice

Stop writing `'xs' | 'sm' | 'md' | ...` by hand. Each prop type is a slice of the scale:

- Full scale (`xs`–`xl`): Flex gap, Grid gap, text size, typography spacing.
- Drop `xl` (`xs`–`lg`): button, spinner, grid min-width, card min-width, card title size, title size.
- Drop `xs` (`sm`–`xl`): sheet width, dialog width.
- `xs`–`sm` only: job status and schedule size props.

Files: [`Flex.types.ts`](frontend/src/components/blocks/flex/Flex.types.ts), [`Grid.types.ts`](frontend/src/components/blocks/grid/Grid.types.ts), [`Button.types.ts`](frontend/src/components/blocks/button/Button.types.ts), [`Spinner.types.ts`](frontend/src/components/blocks/spinner/Spinner.types.ts), [`Text.types.ts`](frontend/src/components/blocks/text/Text.types.ts), [`Title.types.ts`](frontend/src/components/blocks/title/Title.types.ts), [`Sheet.types.ts`](frontend/src/components/blocks/sheet/Sheet.types.ts), [`Dialog.types.ts`](frontend/src/components/blocks/dialog/Dialog.types.ts), [`Card.tsx`](frontend/src/components/blocks/card/Card.tsx), [`Status.tsx`](frontend/src/components/pages/jobs/components/jobsList/components/shared/components/status/Status.tsx), [`Schedule.tsx`](frontend/src/components/pages/jobs/components/jobsList/components/shared/components/schedule/Schedule.tsx).

## 5. Leave semantic maps written out

Text and title do not follow the prefix (`md` is `text-base`, text `xl` is `text-2xl`, title `lg` is `text-xl`). Keep those objects in [`text.variants.ts`](frontend/src/components/blocks/shared/variants/typography/text.variants.ts) and [`title.variants.ts`](frontend/src/components/blocks/shared/variants/typography/title.variants.ts), and type them so they must list every step in their slice. A new step then fails to compile until the class is filled in.

Do not touch shadcn size names in `frontend/src/components/ui/` (`default`, `icon-sm`, item `xs`) or the radius and `--text-*` variables in CSS.

## 6. Check the class strings still match

Run the existing Flex, Grid, Card, Sheet, Dialog, Spinner, Text, and Title tests. They already assert classes such as `sm:max-w-lg` and `min-w-sm`. Add a small test for `tokens` that a prefix and a slice produce the expected keys and class strings.
