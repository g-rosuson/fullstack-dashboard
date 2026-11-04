import Turn from './turn/Turn';
import Flex from '@/components/blocks/flex/Flex';

import mappers from './mappers';

import type { Conversation } from '@/shared/types/conversation';

interface TurnsProps {
    composerHeight: number;
    conversation: Conversation;
}

const Turns = ({ composerHeight, conversation }: TurnsProps) => {
    const mappedTurns = mappers.mapToTurns(conversation.turns);

    return (
        <Flex direction="column" gap="xl">
            {mappedTurns.map(turn => (
                <Turn
                    key={turn.turnId}
                    turn={turn}
                    conversationStatus={conversation.status}
                    composerHeight={composerHeight}
                />
            ))}
        </Flex>
    );
};

export default Turns;
