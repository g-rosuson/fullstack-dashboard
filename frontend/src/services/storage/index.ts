import logging from '@/services/logging';
import { type Theme } from '@/shared/types/theme';
import utils from '@/utils';

// Determine local storage theme key name
const THEME_KEY = 'theme';

/**
 * Sets the given theme in local storage.
 */
const setTheme = (theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme);
};

/**
 * Gets the theme from local storage.
 */
const getTheme = () => {
    const raw = localStorage.getItem(THEME_KEY);

    if (raw && !utils.validators.isTheme(raw)) {
        logging.warning(`[storage]: Invalid theme, expected value "dark" or "light" but got: ${raw}`);
    }
        
    return utils.validators.isTheme(raw) ? raw : null;
};

export default {
    setTheme,
    getTheme
};

