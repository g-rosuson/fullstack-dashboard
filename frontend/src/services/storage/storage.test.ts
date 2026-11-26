import { beforeEach, describe, expect, it, vi } from 'vitest';

import storage from './';
import conversationConstants from '@/components/pages/conversation/constants';
import logging from '@/services/logging';
import utils from '@/utils';

describe('Theme storage:', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    describe('setTheme', () => {
        it('stores the given theme in localStorage', () => {
            storage.ui.theme.setTheme('dark');
            expect(localStorage.getItem('theme')).toBe('dark');

            storage.ui.theme.setTheme('light');
            expect(localStorage.getItem('theme')).toBe('light');
        });
    });

    describe('getTheme', () => {
        it('returns the theme if a valid one is stored', () => {
            localStorage.setItem('theme', 'dark');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(true);

            expect(storage.ui.theme.getTheme()).toBe('dark');
        });

        it('returns null if an invalid theme is stored', () => {
            localStorage.setItem('theme', 'neon-pink');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(false);
            vi.spyOn(logging, 'warning').mockImplementation(() => {});

            expect(storage.ui.theme.getTheme()).toBeNull();
        });

        it('returns null if no theme is stored', () => {
            expect(storage.ui.theme.getTheme()).toBeNull();
        });

        it('logs a warning if theme is invalid', () => {
            localStorage.setItem('theme', 'banana');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(false);

            const warnSpy = vi.spyOn(logging, 'warning').mockImplementation(() => {});

            storage.ui.theme.getTheme();

            expect(warnSpy).toHaveBeenCalledWith(
                '[storage]: Invalid theme, expected value "dark" or "light" but got: banana'
            );
        });

        it('does not log a warning if theme is valid', () => {
            localStorage.setItem('theme', 'light');
            vi.spyOn(utils.validators, 'isTheme').mockReturnValue(true);

            const warnSpy = vi.spyOn(logging, 'warning');

            storage.ui.theme.getTheme();

            expect(warnSpy).not.toHaveBeenCalled();
        });
    });
});

describe('Turn collapsible storage:', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('stores closed and open for a turn and keeps another conversation', () => {
        storage.ui.conversations.setTurnCollapsibleState('conversation-1', 'turn-1', false);
        storage.ui.conversations.setTurnCollapsibleState('conversation-2', 'turn-9', true);
        storage.ui.conversations.setTurnCollapsibleState('conversation-1', 'turn-1', true);

        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-1', 'turn-1')).toBe(true);
        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-2', 'turn-9')).toBe(true);
        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-1', 'turn-2')).toBeNull();
    });

    it('does not store a placeholder conversation id or turn id', () => {
        storage.ui.conversations.setTurnCollapsibleState('conversation-1', 'turn-1', false);
        storage.ui.conversations.setTurnCollapsibleState(conversationConstants.initialConversationId, 'turn-1', false);
        storage.ui.conversations.setTurnCollapsibleState('conversation-1', conversationConstants.initialTurnId, false);

        expect(localStorage.getItem('turnIdsToCollapseStateMap')).toBe(
            JSON.stringify({ 'conversation-1': { 'turn-1': false } })
        );
        expect(
            storage.ui.conversations.getTurnCollapsibleState(conversationConstants.initialConversationId, 'turn-1')
        ).toBeNull();
        expect(
            storage.ui.conversations.getTurnCollapsibleState('conversation-1', conversationConstants.initialTurnId)
        ).toBeNull();
    });

    it('treats invalid JSON as empty and replaces it on the next toggle', () => {
        localStorage.setItem('turnIdsToCollapseStateMap', '{');
        const warnSpy = vi.spyOn(logging, 'warning').mockImplementation(() => {});

        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-1', 'turn-1')).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith('[storage]: Invalid turn collapsible state');

        storage.ui.conversations.setTurnCollapsibleState('conversation-1', 'turn-1', false);

        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-1', 'turn-1')).toBe(false);
    });

    it('does not throw when localStorage throws', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        vi.spyOn(logging, 'error').mockImplementation(() => {});

        expect(() => storage.ui.conversations.setTurnCollapsibleState('conversation-1', 'turn-1', false)).not.toThrow();

        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });

        expect(storage.ui.conversations.getTurnCollapsibleState('conversation-1', 'turn-1')).toBeNull();
    });
});
