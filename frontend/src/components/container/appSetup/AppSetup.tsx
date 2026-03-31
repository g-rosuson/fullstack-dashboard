import { ReactNode, useEffect } from 'react';
import { useUserInterfaceSelection } from 'store/selectors/ui';

import config from 'config';
import storage from 'services/storage';

const AppSetup = ({ children }: { children: ReactNode }) => {
    // UI store
    const { theme, changeTheme } = useUserInterfaceSelection();

    // * Initialize theme
    // Get persisted theme from local storage
    const persistedTheme = storage.getTheme();

    // Check if the system theme is dark
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // If no theme persisted, use system preference
    const themeToApply = persistedTheme || (prefersDark ? 'dark' : 'light');

    // Toggle dark mode class on the root element
    document.documentElement.classList.toggle('dark', themeToApply === 'dark');

    // * Set backend URL on the global object
    const isDeveloping = window.location.hostname === 'localhost';
    const backendRootUrl = isDeveloping ? config.connect.backend.dev.url : config.connect.backend.prod.url;

    window.metadata = window.metadata ?? {};
    window.metadata.backendRootUrl = backendRootUrl;


    /**
     * Updates the store theme only if it 
     * from the resolved initial theme.
     */
    useEffect(() => {
        if (themeToApply !== theme) {
            changeTheme(themeToApply);
        }
    }, [changeTheme, themeToApply, theme]);


    return children;
};

export default AppSetup;
