import Turn from './turn/Turn';
import Flex from '@/components/blocks/flex/Flex';

import mappers from './mappers';

import type { Conversation } from '@/shared/types/conversation';

import conversationConstants from '@/components/pages/conversation/constants';

interface TurnsProps {
    composerHeight: number;
    conversation: Conversation;
    pinnedTurnId?: string;
    revealTurnId?: string;
    answerMinHeight?: number;
    turnIds: string[];
    // eslint-disable-next-line no-unused-vars
    onTurnIdChange: (turnId: string) => void;
}

/**
 * Chooses which turn keeps the reserved answer space.
 * When the server id replaces the optimistic id before the pin updates, the last turn keeps that space.
 * @param turnIds - Turn ids currently on screen, oldest first.
 * @param pinnedTurnId - The turn that was pinned when the prompt was submitted.
 */
const resolveTurnIdWithAnswerSpace = (turnIds: string[], pinnedTurnId: string | undefined) => {
    if (!pinnedTurnId) {
        return undefined;
    }

    if (turnIds.includes(pinnedTurnId)) {
        return pinnedTurnId;
    }

    if (pinnedTurnId === conversationConstants.initialTurnId) {
        return turnIds.at(-1);
    }

    return undefined;
};

const Turns = ({
    composerHeight,
    conversation,
    pinnedTurnId,
    revealTurnId,
    answerMinHeight,
    turnIds,
    onTurnIdChange,
}: TurnsProps) => {
    conversation.turns;
    /**
     * Determines if the turn is the last turn.
     * @param index - The index of the turn.
     * @returns Whether the turn is the last turn.
     */
    const isLastTurn = (index: number) => {
        const normalizedIndex = index + 1;
        return normalizedIndex === mappedTurns.length;
    };
    const mappedTurns = mappers.mapToTurns(conversation.turns);
    const turnIdWithAnswerSpace = resolveTurnIdWithAnswerSpace(
        mappedTurns.map(turn => turn.turnId),
        pinnedTurnId
    );

    return (
        <Flex as="section" direction="column" gap="sm">
            {mappedTurns.map((turn, index) => (
                <Turn
                    key={turn.turnId}
                    conversationId={conversation.conversationId}
                    turn={turn}
                    conversationStatus={conversation.status}
                    composerHeight={composerHeight}
                    pinnedTurnId={turnIdWithAnswerSpace}
                    answerMinHeight={answerMinHeight}
                    isLastTurn={isLastTurn(index)}
                    isAttached={turnIds.includes(turn.turnId)}
                    revealTurnId={revealTurnId}
                    onTurnIdChange={onTurnIdChange}
                />
            ))}
        </Flex>
    );
};

export default Turns;
