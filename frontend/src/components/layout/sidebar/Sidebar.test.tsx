import { type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Sidebar from './Sidebar';

// === Mock config ===
vi.mock('config', () => ({
    default: {
        routes: {
            root: '/',
        },
    },
}));

// === Mock Icons ===
vi.mock('@/components/UI/icons/Icons', () => ({
    SidebarClose: () => <svg data-testid="icon-close" />,
    Home: () => <svg data-testid="icon-home" />,
    Suitcase: () => <svg data-testid="icon-suitcase" />,
}));

// === Mock store ===
const toggleSidebarMock = vi.fn();
// Note: vi.mock is hoisted under the hood, therefore we
// need to hoist "useUserInterfaceSelectionMock" as well
const useUserInterfaceSelectionMock = vi.hoisted(() =>
    vi.fn(() => ({
        isSidebarOpen: true,
        toggleSidebar: toggleSidebarMock,
    }))
);

vi.mock('store/selectors/ui', () => ({
    useUserInterfaceSelection: useUserInterfaceSelectionMock,
}));

/**
 * Custom render helper that sets the sidebar open/close state
 * and allows specifying the current route.
 */
const renderSidebar = (
    isSidebarOpen: boolean,
    initialRoute: string,
    additionalRoutes: { path: string; element: ReactNode }[] = []
) => {
    useUserInterfaceSelectionMock.mockReturnValue({
        isSidebarOpen,
        toggleSidebar: toggleSidebarMock,
    });

    render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path="*" element={<Sidebar />} />

                {additionalRoutes.map(({ path, element }) => (
                    <Route key={path} path={path} element={element} />
                ))}
            </Routes>
        </MemoryRouter>
    );
};

describe('Sidebar component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the sidebar and navigation items', () => {
        renderSidebar(true, '/');

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByTestId('icon-home')).toBeInTheDocument();
        expect(screen.getByTestId('icon-close')).toBeInTheDocument();
    });

    it('renders sidebar as visible when "isSidebarOpen" is true', () => {
        renderSidebar(true, '/');

        expect(screen.getByTestId('sidebar')).toBeVisible();
    });

    it('renders sidebar as hidden when "isSidebarOpen" is false', () => {
        renderSidebar(false, '/');

        expect(screen.getByTestId('sidebar').className).toContain('hidden');
    });

    it('"aria-hidden" attribute value is false when "side-bar is open', () => {
        renderSidebar(true, '/');

        expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-hidden', 'false');
    });

    it('sets aria-hidden when side-bar is closed', () => {
        renderSidebar(false, '/');

        expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-hidden', 'true');
    });

    it('"toggleSidebar" is invoked when pressing the close-sidebar button', async () => {
        renderSidebar(true, '/');

        await userEvent.click(screen.getByTestId('close-sidebar-btn'));

        expect(toggleSidebarMock).toHaveBeenCalledTimes(1);
    });

    it('marks route link as active when route matches', () => {
        // Set initial route to `/`, which matches the "Home" link
        renderSidebar(true, '/');

        const link = screen.getByText('Home').closest('a');
        expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark route link as active when route does not match', () => {
        // Set initial route to `/not-home`, which does NOT match "Home"
        renderSidebar(true, '/not-home');

        const link = screen.getByText('Home').closest('a');
        expect(link).not.toHaveAttribute('aria-current', 'page');
    });

    it('renders corresponding view when nav link is clicked', async () => {
        renderSidebar(true, '/not-home', [{ path: '/', element: <h1>Home View</h1> }]);

        await userEvent.click(screen.getByText('Home'));

        expect(screen.getByRole('heading', { name: 'Home View' })).toBeInTheDocument();
    });
});
