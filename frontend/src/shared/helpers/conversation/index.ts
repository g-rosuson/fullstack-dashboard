import type { Conversation, ConversationTurn } from '@/shared/types/conversation';

/**
 * The open turn is the one still being answered. A conversation holds one.
 * @param conversation - The conversation to search.
 * @returns The index of that turn, or `-1` when there is none.
 */
const openTurnIndex = (conversation: Conversation | undefined): number => {
    /**
     * A turn is still open when it has no saved answer and has not stopped or failed.
     * @param turn - The turn to check.
     * @returns Whether a later step still belongs on that turn.
     */
    const turnIsOpen = (turn: ConversationTurn | undefined): boolean => Boolean(turn && !turn.finishedAt && !turn.end);

    if (!conversation) {
        return -1;
    }

    for (let index = conversation.turns.length - 1; index >= 0; index -= 1) {
        if (turnIsOpen(conversation.turns[index])) {
            return index;
        }
    }

    return -1;
};

/**
 * The turn still being answered, if this conversation has one.
 * @param conversation - The conversation to search.
 * @returns That turn, or none.
 */
const openTurn = (conversation: Conversation | undefined): ConversationTurn | undefined => {
    const index = openTurnIndex(conversation);

    if (!conversation || index === -1) {
        return undefined;
    }

    return conversation.turns[index];
};

export { openTurn, openTurnIndex };
