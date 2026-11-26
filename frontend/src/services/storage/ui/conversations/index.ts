import browser from '../../browser';
import conversationConstants from '@/components/pages/conversation/constants';
import logging from '@/services/logging';

const turnCollapsibleStateKey = 'turnIdsToCollapseStateMap';

type TurnCollapsibleState = Record<string, Record<string, boolean>>;

/**
 * A placeholder id exists only until the server id arrives, so it is not stored.
 */
const isPlaceholder = (conversationId: string, turnId: string) =>
    conversationId === conversationConstants.initialConversationId || turnId === conversationConstants.initialTurnId;

/**
 * True when the stored document is a map of conversation ids to turn-open booleans.
 */
const isTurnCollapsibleState = (value: unknown): value is TurnCollapsibleState => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every(turns => {
        if (!turns || typeof turns !== 'object' || Array.isArray(turns)) {
            return false;
        }

        return Object.values(turns).every(open => typeof open === 'boolean');
    });
};

/**
 * Reads the stored document. Invalid JSON is empty so the next toggle can replace it.
 */
const readTurnCollapsibleState = (): TurnCollapsibleState => {
    const raw = browser.getItem(turnCollapsibleStateKey);

    if (!raw) {
        return {};
    }

    try {
        const parsed: unknown = JSON.parse(raw);

        if (!isTurnCollapsibleState(parsed)) {
            logging.warning('[storage]: Invalid turn collapsible state');

            return {};
        }

        return parsed;
    } catch {
        logging.warning('[storage]: Invalid turn collapsible state');

        return {};
    }
};

/**
 * The stored expanded or collapsed choice for one turn, or null when nothing is stored.
 */
const getTurnCollapsibleState = (conversationId: string, turnId: string): boolean | null => {
    if (isPlaceholder(conversationId, turnId)) {
        return null;
    }

    const open = readTurnCollapsibleState()[conversationId]?.[turnId];

    return typeof open === 'boolean' ? open : null;
};

/**
 * Stores whether one turn is expanded. Other conversations and turns stay as they are.
 */
const setTurnCollapsibleState = (conversationId: string, turnId: string, open: boolean) => {
    if (isPlaceholder(conversationId, turnId)) {
        return;
    }

    const state = readTurnCollapsibleState();
    const turns = state[conversationId] ?? {};

    browser.setItem(
        turnCollapsibleStateKey,
        JSON.stringify({
            ...state,
            [conversationId]: {
                ...turns,
                [turnId]: open,
            },
        })
    );
};

export default {
    getTurnCollapsibleState,
    setTurnCollapsibleState,
};
