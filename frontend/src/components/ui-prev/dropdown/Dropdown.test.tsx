import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dropdown from './Dropdown';
/**
 * Renders the dropdown with the given props into the JS-DOM and returns testing utilities.
 */
const setupDropdown = (isOpen = true) => {
    const props = {
        open: isOpen,
        close: vi.fn(),
        actions: [
            { label: 'Action 1', icon: <svg>icon</svg>, action: vi.fn() },
            { label: 'Action 2', icon: <svg>icon</svg>, action: vi.fn() },
        ],
        controller: <button>Open Menu</button>,
    };

    render(<Dropdown {...props} />);

    return {
        close: props.close,
        actions: props.actions,
    };
};

describe('Dropdown component', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('is visible when open is true', () => {
        setupDropdown();
        expect(screen.getByRole('menu')).toBeVisible();
    });

    it('is hidden when "open" is false', () => {
        setupDropdown(false);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('renders icons', () => {
        setupDropdown();

        const icons = screen.getAllByText('icon');
        expect(icons).toHaveLength(2);
    });

    it('closes when clicking outside the dropdown', async () => {
        const { close } = setupDropdown();

        await userEvent.click(document.body);

        expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the dropdown', async () => {
        const { close } = setupDropdown();

        await userEvent.click(screen.getByRole('menu'));

        expect(close).not.toHaveBeenCalled();
    });

    it('triggers the correct action on click', async () => {
        const { actions } = setupDropdown();

        await userEvent.click(screen.getByText('Action 1'));

        expect(actions[0].action).toHaveBeenCalledTimes(1);
        expect(actions[1].action).not.toHaveBeenCalled();
    });

    it('supports keyboard navigation using Enter', async () => {
        const { actions } = setupDropdown();

        const items = screen.getAllByRole('menuitem');

        items[0].focus();

        await userEvent.keyboard('{Enter}');
        
        expect(actions[0].action).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation using Space', async () => {
        const { actions } = setupDropdown();

        const items = screen.getAllByRole('menuitem');

        items[0].focus();

        await userEvent.keyboard(' ');
        
        expect(actions[0].action).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility attributes', () => {
        setupDropdown();

        const menu = screen.getByRole('menu');

        expect(menu).toHaveAttribute('aria-expanded', 'true');
        expect(menu).toHaveAttribute('aria-label', 'User menu');
    });
});