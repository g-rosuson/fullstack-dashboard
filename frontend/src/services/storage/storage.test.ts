import { beforeEach, describe, expect, it, vi } from 'vitest';

import storage from './';
import logging from '@/services/logging';
import utils from '@/utils';

describe('Theme storage:', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('setTheme', () => {
        it('stores the given theme in localStorage', () => {
            storage.setTheme('dark');
            expect(localStorage.getItem('theme')).toBe('dark');

            storage.setTheme('light');
            expect(localStorage.getItem('theme')).toBe('light');
        });
    });

    describe('getTheme', () => {
        it('returns the theme if a valid one is stored', () => {
            localStorage.setItem('theme', 'dark');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(true);

            expect(storage.getTheme()).toBe('dark');
        });

        it('returns null if an invalid theme is stored', () => {
            localStorage.setItem('theme', 'neon-pink');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(false);

            expect(storage.getTheme()).toBeNull();
        });

        it('returns null if no theme is stored', () => {
            expect(storage.getTheme()).toBeNull();
        });

        it('logs a warning if theme is invalid', () => {
            localStorage.setItem('theme', 'banana');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(false);

            const warnSpy = vi.spyOn(logging, 'warning');

            storage.getTheme();

            expect(warnSpy).toHaveBeenCalledWith(
                '[storage]: Invalid theme, expected value "dark" or "light" but got: banana'
            );
        });

        it('does not log a warning if theme is valid', () => {
            localStorage.setItem('theme', 'light');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(true);

            const warnSpy = vi.spyOn(logging, 'warning');

            storage.getTheme();

            expect(warnSpy).not.toHaveBeenCalled();
        });
    });
});
