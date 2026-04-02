# Frontend

## shadcn workflow

To add a shadcn component and immediately format generated files:

```bash
npm run scadd -- button
```

Use any component name after `--` (for example: `sidebar`, `sheet`, `dialog`).

The `scadd` script runs:
1) `npx shadcn@latest add <component>`
2) `npm run format`

Note on `--`:
- `npm run scadd -- <component>` forwards `<component>` to the script (this is required with npm scripts).
