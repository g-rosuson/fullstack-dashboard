import logging from '@/services/logging';

/**
 * Reads one localStorage value.
 * A privacy-mode or quota throw is logged and treated as a missing value.
 */
const getItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        logging.error(error instanceof Error ? error : new Error(String(error)));

        return null;
    }
};

/**
 * Writes one localStorage value.
 * A privacy-mode or quota throw is logged and ignored so the click still finishes.
 */
const setItem = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        logging.error(error instanceof Error ? error : new Error(String(error)));
    }
};

/**
 * Removes one localStorage value.
 * A privacy-mode or quota throw is logged and ignored.
 */
const removeItem = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        logging.error(error instanceof Error ? error : new Error(String(error)));
    }
};

export default {
    getItem,
    setItem,
    removeItem,
};
