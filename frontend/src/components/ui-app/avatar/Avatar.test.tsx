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

    it('is a HTML button element', () => {
        renderAvatar();
        expect(screen.getByRole('button', { name: 'user avatar' })).toBeInstanceOf(HTMLButtonElement);
    });

    it('has an appropriate aria-label', () => {
        renderAvatar();
        expect(screen.getByRole('button', { name: 'user avatar' })).toHaveAttribute('aria-label', 'user avatar');
    });

    it('renders and capitalizes the first letter of the email', () => {
        renderAvatar();
        expect(screen.getByRole('button', { name: 'user avatar' })).toHaveTextContent('E');
    });

    it('opens the dropdown menu when clicked', async () => {
        renderAvatar();
        await userEvent.click(screen.getByRole('button', { name: 'user avatar' }));
        expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
    });

    it('invokes the action when a menu item is clicked', async () => {
        renderAvatar();
        await userEvent.click(screen.getByRole('button', { name: 'user avatar' }));
        await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
        expect(mockLogoutAction).toHaveBeenCalledTimes(1);
    });
});
