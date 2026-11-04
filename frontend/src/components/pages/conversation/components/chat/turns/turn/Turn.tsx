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
    const showStatus = ['processing', 'permission', 'error'].includes(conversationStatus);
    const showPanel = conversationStatus === 'idle';

    return (
        <div className="relative">
            <Animate>
                <Flex direction="column" gap="sm">
                    {turn.messages.map(message => (
                        <Message key={message.turnId} message={message} />
                    ))}
                </Flex>
            </Animate>

            {showStatus && (
                <Animate>
                    <Status events={turn.streamEvents} />
                </Animate>
            )}

            {showPanel && <EventPanel composerHeight={composerHeight} events={turn.persistedEvents} />}
        </div>
    );
};

export default Turn;
