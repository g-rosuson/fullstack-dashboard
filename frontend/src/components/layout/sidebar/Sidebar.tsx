import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

import Button from '@/components/ui-prev/button/Button';
import { Home, SidebarClose, Suitcase } from '@/components/ui-prev/icons/Icons';

import config from '@/config';
import { useUserInterfaceSelection } from '@/store/selectors/ui';

const Sidebar = () => {
    const sidebarBaseClassName =
        'overflow-x-hidden border-r border-border bg-surface transition-all duration-200 ease-in-out';
    const sidebarOpenClassName = 'block';
    const sidebarCloseClassName = 'hidden';
    const headerClassName = 'flex justify-end p-2';
    const wrapperClassName = 'p-2 [&>li:not(:last-child)]:mb-1';
    const linkBaseClassName =
        'flex items-center gap-2 rounded-md p-2 text-foreground transition-colors duration-200 ease-in-out hover:bg-surface-hover';
    const activeLinkClassName = `${linkBaseClassName} bg-surface-hover`;
    const iconClassName = 'flex items-center justify-center text-3xl';
    const labelClassName = 'text-lg opacity-100 transition-opacity duration-200 ease-in-out';

    // Store selectors
    const { isSidebarOpen, toggleSidebar } = useUserInterfaceSelection();

    /**
     * Returns a CSS link class based on whether the
     * corresponding link path is active or idle.
     */
    const getLinkClass = ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
            return activeLinkClassName;
        }

        return linkBaseClassName;
    };

    // Determine side-bar items
    const sidebarNavItems = [
        {
            label: 'Home',
            icon: <Home thick />,
            route: config.routes.root,
        },
        {
            label: 'Jobs',
            icon: <Suitcase thick />,
            route: config.routes.jobs,
        },
    ];

    return (
        <aside
            data-testid="sidebar"
            className={clsx(sidebarBaseClassName, isSidebarOpen ? sidebarOpenClassName : sidebarCloseClassName)}
            aria-hidden={isSidebarOpen === false}
            aria-label="Sidebar">
            <div className={headerClassName}>
                <Button
                    testId="close-sidebar-btn"
                    icon={<SidebarClose thick />}
                    ariaLabel="Close sidebar"
                    onClick={toggleSidebar}
                />
            </div>

            <nav>
                <ul className={wrapperClassName}>
                    {sidebarNavItems.map(item => (
                        <li key={item.label}>
                            <NavLink to={item.route} className={getLinkClass}>
                                <div className={iconClassName}>{item.icon}</div>

                                <span className={labelClassName}>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
