import { render, screen } from '@testing-library/react';

import Heading from './Heading';

describe('Heading component', () => {
    it('renders the correct heading tag based on the "level" prop', () => {
        render(<Heading level={1}>Heading 1</Heading>);
        expect(screen.getByText('Heading 1').tagName).toBe('H1');

        render(<Heading level={2}>Heading 2</Heading>);
        expect(screen.getByText('Heading 2').tagName).toBe('H2');

        render(<Heading level={3}>Heading 3</Heading>);
        expect(screen.getByText('Heading 3').tagName).toBe('H3');
    });

    it('merges the className prop without overriding base styles', () => {
        // size="l" has no font-weight variant, so the base font-bold survives tailwind-merge
        render(
            <Heading level={1} size="l" className="mt-4">
                Heading with margin
            </Heading>
        );
        const heading = screen.getByText('Heading with margin');
        expect(heading).toHaveClass('mt-4');
        expect(heading).toHaveClass('font-bold');
    });
});
