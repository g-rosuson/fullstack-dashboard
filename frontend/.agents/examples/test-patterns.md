# Frontend Test Patterns

Canonical examples for React component tests using `@testing-library/react`.

---

## Component Test

```typescript
// frontend/src/components/ui-app/button/Button.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
    it('renders label', () => {
        render(<Button label="Submit" type="button" />);
        expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        render(<Button label="Click me" type="button" onClick={onClick} />);

        await userEvent.click(screen.getByText('Click me'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('does not call onClick when loading', async () => {
        const onClick = vi.fn();
        render(<Button label="Loading" type="button" isLoading onClick={onClick} />);

        await userEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('renders spinner and hides label when isLoading', () => {
        render(<Button label="Submit" type="button" isLoading />);
        expect(screen.queryByText('Submit')).not.toBeInTheDocument();
    });
});
```

Rules:
- Test user-visible behavior, not implementation details.
- Use `screen` queries by role, text, or label — not by class or test ID where avoidable.
- Co-locate: `Button.tsx` → `Button.test.tsx`.
