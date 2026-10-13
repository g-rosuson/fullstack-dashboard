import { useNavigate } from 'react-router-dom';
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';

import Avatar from '@/components/blocks/avatar/Avatar';
import Button from '@/components/blocks/button/Button';
import Flex from '@/components/blocks/flex/Flex';

import api from '@/api';
import { useSidebar } from '@/components/ui/sidebar';
import config from '@/config';
import logging from '@/services/logging';
import storage from '@/services/storage';
import { Theme } from '@/shared/types/theme';
import { useChatSelection } from '@/store/selectors/chat';
import { useUserInterfaceSelection } from '@/store/selectors/ui';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const TopBar = () => {
    // Selectors
    const { isSidebarOpen, theme, changeTheme } = useUserInterfaceSelection();
    const { email, clearUser } = useUserSelection();
    const { clearChat } = useChatSelection();
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

            // Reset the user and chat store objects
            clearUser();
            clearChat();

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
            onClick: onLogout,
        },
    ];

    // Determine active theme
    const isDarkModeActive = theme === 'dark';

    // Determine theme icon
    const ThemeIcon = isDarkModeActive ? Sun : Moon;

    // Determine theme button aria-label
    const nextThemeForAriaLabel: Theme = isDarkModeActive ? 'light' : 'dark';
    const themeButtonAriaLabel = `Toggle theme to ${nextThemeForAriaLabel} mode`;

    return (
        <header className="sticky top-0 w-full border-b border-border bg-surface p-md z-10">
            <Flex justify="between" align="center">
                <div>
                    <Button
                        variant="outline"
                        icon={isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                        ariaLabel="Toggle sidebar"
                        onClick={toggleSidebar}
                    />
                </div>

                <div className="flex items-center gap-sm">
                    <Button
                        variant="outline"
                        icon={<ThemeIcon />}
                        ariaLabel={themeButtonAriaLabel}
                        onClick={utils.time.throttle(onThemeChange, 1000)}
                    />

                    <Avatar email={email || ''} actions={userMenuActions} />
                </div>
            </Flex>
        </header>
    );
};

export default TopBar;
