import { render, screen } from '@testing-library/react';

import Title from './Title';

/**
 * Margin utilities applied to a title, used to compare spacing without pinning a default step.
 */
const marginClasses = (element: HTMLElement) => [...element.classList].filter(className => className.startsWith('mb-'));

describe('Title component', () => {
    it('[CLIENT-UI-TTL-001] / [FR-UI-TTL-001] renders the correct heading tag based on the "level" prop', () => {
        render(<Title level={1}>Title 1</Title>);
        expect(screen.getByText('Title 1').tagName).toBe('H1');

        render(<Title level={2}>Title 2</Title>);
        expect(screen.getByText('Title 2').tagName).toBe('H2');

        render(<Title level={3}>Title 3</Title>);
        expect(screen.getByText('Title 3').tagName).toBe('H3');

        render(<Title level={4}>Title 4</Title>);
        expect(screen.getByText('Title 4').tagName).toBe('H4');

        render(<Title level={5}>Title 5</Title>);
        expect(screen.getByText('Title 5').tagName).toBe('H5');

        render(<Title level={6}>Title 6</Title>);
        expect(screen.getByText('Title 6').tagName).toBe('H6');
    });

    it('merges the className prop without overriding base styles', () => {
        // size="lg" has no font-weight variant, so the base font-bold survives tailwind-merge
        render(
            <Title level={1} size="lg" className="mt-md">
                Title with margin
            </Title>
        );
        const title = screen.getByText('Title with margin');
        expect(title).toHaveClass('mt-md');
        expect(title).toHaveClass('font-bold');
    });

    it('keeps the same default spacing when size changes', () => {
        render(
            <>
                <Title level={1} size="lg">
                    Large title
                </Title>
                <Title level={2} size="sm">
                    Small title
                </Title>
            </>
        );
        const large = screen.getByText('Large title');
        const small = screen.getByText('Small title');

        expect(large).toHaveClass('text-xl');
        expect(small).toHaveClass('text-sm');
        expect(marginClasses(large)).toEqual(marginClasses(small));
    });

    it('applies spacing="none" without changing size', () => {
        render(
            <Title level={2} size="sm" spacing="none">
                No margin
            </Title>
        );
        const title = screen.getByText('No margin');
        expect(title).toHaveClass('text-sm');
        expect(marginClasses(title)).toEqual(['mb-0']);
    });

    it('applies an explicit spacing step without changing size', () => {
        render(
            <Title level={1} size="lg" spacing="md">
                Spaced title
            </Title>
        );
        const title = screen.getByText('Spaced title');
        expect(title).toHaveClass('text-xl');
        expect(marginClasses(title)).toEqual(['mb-md']);
    });
});
