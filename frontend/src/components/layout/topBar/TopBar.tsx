import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';

import Avatar from '@/components/ui-app/avatar/Avatar';
import Button from '@/components/ui-app/button/Button';

import api from '@/api';
import { useSidebar } from '@/components/ui/sidebar';
import config from '@/config';
import logging from '@/services/logging';
import storage from '@/services/storage';
import { Theme } from '@/shared/types/theme';
import { useUserInterfaceSelection } from '@/store/selectors/ui';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const TopBar = () => {
    const headerClassName =
        'sticky top-0 flex w-full items-center justify-between border-b border-border bg-surface p-2';
    const actionsWrapperClassName = 'flex gap-4';

    // Selectors
    const { isSidebarOpen, theme, changeTheme } = useUserInterfaceSelection();
    const { email, clearUser } = useUserSelection();
    const { toggleSidebar } = useSidebar();

    // Hooks
    const navigate = useNavigate();

    /**
     * Changes the theme and hides flash of unstyles content.
     */
    const onThemeChange = async () => {
        const root = document.documentElement;

        // Turn of the lights to hide flash of unstyled content
        root.style.filter = 'brightness(0)';

        // Add a delay to wait for the filter being applied
        await utils.time.sleep(450);

        // Toogle theme
        const newTheme = theme === 'dark' ? 'light' : 'dark';

        // Update store
        changeTheme(newTheme);

        // Persist theme in local storage
        storage.setTheme(newTheme);

        // Add a delay to hide flash of unstyled content
        await utils.time.sleep(150);

        // Toggle dark mode class to render corresponding color palette
        root.classList.toggle('dark', newTheme === 'dark');

        // Remove filter
        root.style.filter = '';
    };

    /**
     * - Calls the logout endpoint which clears the httpOnly browser cookie.
     * - And when successful, resets the "user" store object and navigates
     *   the user to the"login" page.
     */
    const onLogout = async () => {
        try {
            // Log user out
            await api.service.resources.authentication.logout();

            // Reset the user store object
            clearUser();

            navigate(config.routes.login);
        } catch (error) {
            logging.error(error as Error);
        }
    };

    // Determine user menu actions
    const userMenuActions = [
        {
            label: 'Logout',
            icon: <LogOut />,
            action: onLogout,
        },
    ];

    // Determine active theme
    const isDarkModeActive = theme === 'dark';

    // Determine theme icon
    const ThemeIcon = isDarkModeActive ? Sun : Moon;

    // Determine theme button aria-label
    const nextThemeForAriaLabel: Theme = isDarkModeActive ? 'light' : 'dark';
    const themeButtonAriaLabel = `Change theme to ${nextThemeForAriaLabel} mode`;

    return (
        <header className={headerClassName}>
            <div>
                <Button
                    variant="outline"
                    icon={isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                    ariaLabel={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                    testId="open-sidebar-btn"
                    onClick={toggleSidebar}
                />
            </div>

            <div className={actionsWrapperClassName}>
                <Button
                    variant="outline"
                    icon={<ThemeIcon />}
                    ariaLabel={themeButtonAriaLabel}
                    testId="toggle-theme-btn"
                    onClick={utils.time.throttle(onThemeChange, 1000)}
                />

                <Avatar email={email || ''} actions={userMenuActions} />
            </div>
        </header>
    );
};

export default TopBar;
