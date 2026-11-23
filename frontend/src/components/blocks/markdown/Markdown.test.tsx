import { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import Markdown from './Markdown';

const control = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock('react-markdown', async () => {
    const actual = await vi.importActual<typeof import('react-markdown')>('react-markdown');
    const Actual = actual.default;

    return {
        ...actual,
        default: (props: ComponentProps<typeof Actual>) => {
            if (control.shouldThrow) {
                throw new Error('render failed');
            }

            return <Actual {...props} />;
        },
    };
});

const answer = `## Goal

##### Fifth

###### Sixth

- Hold
- Skip

| Player | Pts |
| --- | --- |
| Verbruggen | 57 |`;

describe('Markdown block: answer', () => {
    beforeEach(() => {
        control.shouldThrow = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('[CLIENT-MCP-ANS-001] / [FR-MCP-ANS-001] shows headings, lists, and tables', () => {
        render(<Markdown source={answer} />);

        expect(screen.getByRole('heading', { level: 2, name: 'Goal' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 5, name: 'Fifth' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 6, name: 'Sixth' })).toBeInTheDocument();
        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getByText('Hold')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Player' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: '57' })).toBeInTheDocument();
    });

    it('[CLIENT-MCP-ANS-005] / [FR-MCP-ANS-001] / [NFR-SEC-MCP-001] leaves HTML as text', () => {
        const { container } = render(<Markdown source={'Hello <script>alert(1)</script> there'} />);

        expect(container.querySelector('script')).toBeNull();
        expect(container.innerHTML).not.toContain('<script');
        expect(screen.getByText(/alert\(1\)/)).toBeInTheDocument();
    });

    it('[CLIENT-MCP-ANS-004] / [FR-MCP-ANS-004] shows the original text when rendering throws', () => {
        control.shouldThrow = true;
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        render(<Markdown source={'# Kept\n\nSecond paragraph'} />);

        expect(screen.getByText('# Kept')).toBeInTheDocument();
        expect(screen.getByText('Second paragraph')).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
});
