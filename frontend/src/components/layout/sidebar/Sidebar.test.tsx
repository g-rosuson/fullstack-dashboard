import { type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Sidebar from './Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

// === Mock config ===
vi.mock('@/config', () => ({
    default: {
        routes: {
            root: '/',
            jobs: '/jobs',
        },
    },
}));

/**
 * Render helper that allows specifying current route and optional extra routes.
 */
const renderSidebar = (initialRoute: string, additionalRoutes: { path: string; element: ReactNode }[] = []) => {
    render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <SidebarProvider open={true} onOpenChange={() => null}>
                <Routes>
                    <Route path="*" element={<Sidebar />} />

                    {additionalRoutes.map(({ path, element }) => (
                        <Route key={path} path={path} element={element} />
                    ))}
                </Routes>
            </SidebarProvider>
        </MemoryRouter>
    );
};

describe('Sidebar component', () => {
    it('renders the sidebar and navigation items', () => {
        renderSidebar('/');

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Jobs')).toBeInTheDocument();
    });

    it('marks route link as active when route matches', () => {
        renderSidebar('/');

        const link = screen.getByText('Home').closest('a');
        expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark route link as active when route does not match', () => {
        renderSidebar('/jobs');

        const link = screen.getByText('Home').closest('a');
        expect(link).not.toHaveAttribute('aria-current', 'page');
    });

    it('renders corresponding view when nav link is clicked', async () => {
        renderSidebar('/jobs', [{ path: '/', element: <h1>Home View</h1> }]);

        await userEvent.click(screen.getByText('Home'));

        expect(screen.getByRole('heading', { name: 'Home View' })).toBeInTheDocument();
    });
});
