import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TopBar from './TopBar';
import config from '@/config';

// === Mock time utils
vi.mock('@/utils', () => ({
    default: {
        time: {
            throttle: (fn: Function) => fn,
            sleep: () => Promise.resolve(),
        },
    },
}));

// === Mock storage service
const setThemeMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/storage', () => ({
    default: {
        setTheme: setThemeMock,
    },
}));

// === Mock lucide icons used by TopBar ===
vi.mock('lucide-react', () => ({
    PanelLeftOpen: () => <svg data-testid="panel-left-open-icon" />,
    PanelLeftClose: () => <svg data-testid="panel-left-close-icon" />,
    Moon: () => <svg data-testid="moon-icon" />,
    Sun: () => <svg data-testid="sun-icon" />,
}));

// === Mock Avatar component ===
vi.mock('@/components/ui-prev/avatar/Avatar', () => ({
    default: ({ actions }: { actions: Array<{ label: string; action: () => void }> }) => (
        <div>
            <div data-testid="avatar">Avatar</div>
            {actions.map(({ label, action }) => (
                <button key={label} onClick={action}>
                    {label}
                </button>
            ))}
        </div>
    ),
}));

// === Mock user-interface store selector ===
const changeThemeMock = vi.hoisted(() => vi.fn());

// Determine a spreadable base object so we don't have define each
// key/value when we mock the return value of useUserInterfaceSelection
const uiStoreSelection = vi.hoisted(() => ({
    isSidebarOpen: false,
    theme: 'dark',
    changeTheme: changeThemeMock,
}));

const useUserInterfaceSelectionMock = vi.hoisted(() => vi.fn(() => uiStoreSelection));
const toggleSidebarMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/selectors/ui', () => ({
    useUserInterfaceSelection: useUserInterfaceSelectionMock,
}));
vi.mock('@/components/ui/sidebar', () => ({
    useSidebar: () => ({
        toggleSidebar: toggleSidebarMock,
    }),
}));

// === Mock user store selector ===
const clearUserMock = vi.hoisted(() => vi.fn());

vi.mock('@/store/selectors/user', () => ({
    useUserSelection: () => ({
        email: 'user@example.com',
        clearUser: clearUserMock,
    }),
}));

// === Mock logout API ===
const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('@/api', () => ({
    default: {
        service: {
            resources: {
                authentication: {
                    logout: logoutMock,
                },
            },
        },
    },
}));

/**
 * Renders the "TopBar" component into the JS-DOM.
 */
const renderTopBar = () => {
    render(
        <MemoryRouter initialEntries={[config.routes.root]}>
            <Routes>
                <Route path={config.routes.root} element={<TopBar />} />
                <Route path={config.routes.login} element={<h1>Login page</h1>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('TopBar component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        toggleSidebarMock.mockClear();
    });

    it('open sidebar button is rendered when sidebar is closed', () => {
        renderTopBar();

        expect(screen.getByTestId('open-sidebar-btn')).toBeVisible();
        expect(screen.getByTestId('panel-left-open-icon')).toBeVisible();
    });

    it('shows close icon when sidebar is open', () => {
        useUserInterfaceSelectionMock.mockReturnValue({
            ...uiStoreSelection,
            isSidebarOpen: true,
        });

        renderTopBar();

        expect(screen.getByTestId('open-sidebar-btn')).toBeVisible();
        expect(screen.getByTestId('panel-left-close-icon')).toBeVisible();
    });

    it('invokes sidebar toggle when clicking sidebar button', async () => {
        renderTopBar();

        await userEvent.click(screen.getByTestId('open-sidebar-btn'));

        expect(toggleSidebarMock).toHaveBeenCalledTimes(1);
    });

    it('toggle theme button is rendered', () => {
        renderTopBar();

        expect(screen.getByTestId('toggle-theme-btn')).toBeVisible();
    });

    it('toggle theme button contains sun icon when dark-mode is active', () => {
        useUserInterfaceSelectionMock.mockReturnValue({
            ...uiStoreSelection,
            theme: 'dark',
        });

        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');
        const sunIcon = screen.getByTestId('sun-icon');

        expect(toggleThemeButton).toContainElement(sunIcon);
    });

    it('toggle theme button contains moon icon when light-mode is active', () => {
        useUserInterfaceSelectionMock.mockReturnValue({
            ...uiStoreSelection,
            theme: 'light',
        });

        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');
        const moonIcon = screen.getByTestId('moon-icon');

        expect(toggleThemeButton).toContainElement(moonIcon);
    });

    it('toggle theme button switches correctly to dark-mode', async () => {
        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');

        await userEvent.click(toggleThemeButton);

        expect(changeThemeMock).toHaveBeenCalledWith('light');
    });

    it('toggle theme button switches correctly to light-mode', async () => {
        useUserInterfaceSelectionMock.mockReturnValue({
            ...uiStoreSelection,
            theme: 'light',
        });

        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');

        await userEvent.click(toggleThemeButton);

        expect(changeThemeMock).toHaveBeenCalledWith('dark');
    });

    it('toggles dark class on document root correctly when switching theme', async () => {
        const classToggleSpy = vi.spyOn(document.documentElement.classList, 'toggle');

        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');
        await userEvent.click(toggleThemeButton);

        expect(classToggleSpy).toHaveBeenCalledWith('dark', false);
    });

    it('theme is correctly persisted in local-storage', async () => {
        renderTopBar();

        const toggleThemeButton = screen.getByTestId('toggle-theme-btn');
        await userEvent.click(toggleThemeButton);

        expect(setThemeMock).toHaveBeenCalledWith('light');
    });

    it('avatar component is rendered', () => {
        renderTopBar();

        expect(screen.queryByTestId('avatar')).toBeVisible();
    });

    it('logs out the user and shows the login screen', async () => {
        renderTopBar();

        // Open dropdown menu
        userEvent.click(screen.getByTestId('avatar'));

        // Click Logout option
        userEvent.click(screen.getByText('Logout'));

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalled();
            expect(clearUserMock).toHaveBeenCalled();
            expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
        });
    });
});
