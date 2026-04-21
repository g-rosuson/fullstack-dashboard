import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Avatar from './Avatar';

const mockLogoutAction = vi.fn();

const defaultProps = {
    email: 'email@domain.com',
    actions: [{ label: 'Logout', icon: <svg data-testid="logout-icon" />, onClick: mockLogoutAction }],
};

const renderAvatar = () => render(<Avatar {...defaultProps} />);

describe('Avatar component', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('Avatar component is rendered', () => {
        renderAvatar();
        expect(screen.getByLabelText('User avatar')).toBeInTheDocument();
    });

    it('has an appropriate aria-label', () => {
        renderAvatar();
        expect(screen.getByLabelText('User avatar')).toBeInTheDocument();
    });

    it('opens the dropdown menu when clicked', async () => {
        renderAvatar();
        await userEvent.click(screen.getByRole('button', { name: 'Dropdown menu trigger' }));
        expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
    });
});
