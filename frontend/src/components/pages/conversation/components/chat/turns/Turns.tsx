import Turn from './turn/Turn';
import Flex from '@/components/blocks/flex/Flex';

import mappers from './mappers';

import type { Conversation } from '@/shared/types/conversation';

import conversationConstants from '@/components/pages/conversation/constants';

interface TurnsProps {
    composerHeight: number;
    conversation: Conversation;
    pinnedTurnId?: string;
    answerMinHeight?: number;
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

const Turns = ({ composerHeight, conversation, pinnedTurnId, answerMinHeight }: TurnsProps) => {
    const mappedTurns = mappers.mapToTurns(conversation.turns);
    const turnIdWithAnswerSpace = resolveTurnIdWithAnswerSpace(
        mappedTurns.map(turn => turn.turnId),
        pinnedTurnId
    );

    return (
        <Flex direction="column" gap="xl">
            {mappedTurns.map(turn => (
                <Turn
                    key={turn.turnId}
                    turn={turn}
                    conversationStatus={conversation.status}
                    composerHeight={composerHeight}
                    pinnedTurnId={turnIdWithAnswerSpace}
                    answerMinHeight={answerMinHeight}
                />
            ))}
        </Flex>
    );
};

export default Turns;
