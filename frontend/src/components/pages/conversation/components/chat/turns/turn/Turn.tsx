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
}

const Turn = ({ turn, conversationStatus, composerHeight }: TurnProps) => {
    const isOpen = !turn.finishedAt;
    const showStatus = isOpen && ['processing', 'permission', 'error'].includes(conversationStatus);
    const showPanel = !isOpen && turn.persistedEvents.length > 0;

    return (
        <div className="relative">
            <Flex direction="column" gap="sm">
                <Animate>
                    <Flex direction="column" gap="sm">
                        {turn.messages.map(message => (
                            <Message key={message.turnId} message={message} />
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
