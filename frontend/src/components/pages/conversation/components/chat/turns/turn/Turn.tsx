import EventPanel from './eventPanel/EventPanel';
import Message from './message/Message';
import Status from './status/Status';
import Animate from '@/components/blocks/animate/Animate';
import Flex from '@/components/blocks/flex/Flex';

import type { TurnWithMessages } from '../types';
import type { ConversationStatus } from '@/shared/types/conversation';

interface TurnProps {
    turn: TurnWithMessages;
    conversationStatus: ConversationStatus;
    composerHeight: number;
    pinnedTurnId?: string;
    answerMinHeight?: number;
}

const Turn = ({ turn, conversationStatus, composerHeight, pinnedTurnId, answerMinHeight = 0 }: TurnProps) => {
    const isOpen = !turn.finishedAt;
    const showStatus = isOpen && ['processing', 'permission', 'error'].includes(conversationStatus);
    const showPanel = !isOpen && turn.persistedEvents.length > 0;
    const isPinnedTurn = pinnedTurnId === turn.turnId;
    const pinnedTurnStyle = isPinnedTurn ? { minHeight: answerMinHeight } : undefined;

    return (
        <div className="relative" data-turn-id={turn.turnId} style={pinnedTurnStyle}>
            <Flex direction="column" gap="sm">
                <Animate>
                    <Flex direction="column" gap="sm">
                        {turn.messages.map(message => (
                            <Message
                                key={message.turnId}
                                message={message}
                                isPinnedPrompt={isPinnedTurn && message.prompt !== undefined}
                            />
                        ))}
                    </Flex>
                </Animate>

                {showStatus && (
                    <Animate>
                        <Status events={turn.streamEvents} conversationStatus={conversationStatus} />
                    </Animate>
                )}
            </Flex>

            {showPanel && <EventPanel composerHeight={composerHeight} events={turn.persistedEvents} />}
        </div>
    );
};

export default Turn;
