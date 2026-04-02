import { Theme } from '@/shared/types/theme';

/**
 * Validates if the given value is of type Theme
 */
const isTheme = (value: unknown): value is Theme => {
    return value === 'light' || value === 'dark';
};

const validators = {
    isTheme,
};

export default validators;
