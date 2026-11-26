import browser from '../../browser';
import logging from '@/services/logging';
import { type Theme } from '@/shared/types/theme';
import utils from '@/utils';

const themeKey = 'theme';

/**
 * Sets the given theme in local storage.
 */
const setTheme = (theme: Theme) => {
    browser.setItem(themeKey, theme);
};

/**
 * Gets the theme from local storage.
 */
const getTheme = () => {
    const raw = browser.getItem(themeKey);

    if (raw && !utils.validators.isTheme(raw)) {
        logging.warning(`[storage]: Invalid theme, expected value "dark" or "light" but got: ${raw}`);
    }

    return utils.validators.isTheme(raw) ? raw : null;
};

export default {
    setTheme,
    getTheme,
};
