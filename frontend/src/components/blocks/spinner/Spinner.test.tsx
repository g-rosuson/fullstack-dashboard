import { render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';

import Spinner from './Spinner';

describe('Spinner block: status', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-ACT-002] / [FR-UI-ACT-002] exposes a loading status', () => {
        render(<Spinner />);

        expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });
});

describe('Spinner block: type and size', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('applies the requested size class', () => {
        render(<Spinner size="sm" />);

        expect(screen.getByRole('status', { name: 'Loading' })).toHaveClass('size-(--icon-size-sm)');
    });

    it('renders a dotted spinner when type is dotted', () => {
        const { container } = render(<Spinner type="dotted" />);

        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });
});
