import { render, screen } from '@testing-library/react';

import Spinner from './Spinner';

describe('Spinner component', () => {
    it('has the correct ARIA attributes', () => {
        render(<Spinner />);
        const spinner = screen.getByTestId('spinner');
        expect(spinner).toHaveAttribute('role', 'progressbar');
        expect(spinner).toHaveAttribute('aria-busy', 'true');
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });
});