import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BriefcaseBusiness, Home } from 'lucide-react';
import { afterEach } from 'vitest';

import type { SidebarProps } from './Sidebar.types';

import Sidebar from './Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const defaultItems: SidebarProps['items'] = [
    { label: 'Alpha', to: '/alpha' },
    { label: 'Beta', to: '/beta' },
];

/**
 * Renders Sidebar with labelled destinations at a route.
 */
const renderSidebar = (initialRoute: string, props: Partial<SidebarProps> = {}) => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <SidebarProvider open onOpenChange={() => null}>
                <Sidebar items={props.items ?? defaultItems} collapsible={props.collapsible} />
                <Routes>
                    <Route path="/alpha" element={<h1>Alpha view</h1>} />
                    <Route path="/beta" element={<h1>Beta view</h1>} />
                </Routes>
            </SidebarProvider>
        </MemoryRouter>
    );
};

describe('Sidebar block: destinations', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-NAV-001] / [FR-UI-NAV-001] / [FR-UI-ACT-001] exposes each destination with its label as the name', () => {
        renderSidebar('/alpha');

        expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Beta' })).toBeInTheDocument();
    });

    it('[CLIENT-UI-NAV-004] / [FR-UI-NAV-004] renders an optional icon on a top-level destination', () => {
        renderSidebar('/alpha', {
            items: [
                { label: 'Alpha', icon: Home, to: '/alpha' },
                { label: 'Beta', to: '/beta' },
            ],
        });

        expect(screen.getByRole('link', { name: 'Alpha' }).querySelector('svg')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Beta' }).querySelector('svg')).not.toBeInTheDocument();
    });

    it('[CLIENT-UI-NAV-004] / [FR-UI-NAV-004] renders an icon with each nested destination', () => {
        renderSidebar('/alpha', {
            items: [
                {
                    label: 'Group',
                    to: '/group',
                    routes: [
                        { label: 'Alpha', icon: Home, to: '/alpha' },
                        { label: 'Beta', icon: BriefcaseBusiness, to: '/beta' },
                    ],
                },
            ],
        });

        expect(screen.getByRole('link', { name: 'Alpha' }).querySelector('svg')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Beta' }).querySelector('svg')).toBeInTheDocument();
    });
});

describe('Sidebar block: current destination', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-NAV-002] / [FR-UI-NAV-002] indicates the destination that matches the current path', () => {
        renderSidebar('/alpha');

        expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Beta' })).not.toHaveAttribute('aria-current', 'page');
    });

    it('[CLIENT-UI-NAV-002] / [FR-UI-NAV-002] does not indicate a destination that is not current', () => {
        renderSidebar('/beta');

        expect(screen.getByRole('link', { name: 'Alpha' })).not.toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute('aria-current', 'page');
    });
});

describe('Sidebar block: activation', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-NAV-003] / [FR-UI-NAV-003] takes the user to the destination when it is activated', async () => {
        renderSidebar('/beta');

        await userEvent.click(screen.getByRole('link', { name: 'Alpha' }));

        expect(screen.getByRole('heading', { name: 'Alpha view' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('aria-current', 'page');
    });
});
