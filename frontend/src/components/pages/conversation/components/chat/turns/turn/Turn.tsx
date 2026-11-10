import EventPanel from './eventPanel/EventPanel';
import Message from './message/Message';
import Status from './status/Status';
import Animate from '@/components/blocks/animate/Animate';
import Flex from '@/components/blocks/flex/Flex';

import type { TurnWithMessages } from '../types';
import type { ConversationStatus } from '@/shared/types/conversation';

import { cn } from '@/lib/utils';

interface TurnProps {
    turn: TurnWithMessages;
    conversationStatus: ConversationStatus;
    composerHeight: number;
    pinnedTurnId?: string;
    answerMinHeight?: number;
    isLastTurn?: boolean;
}

const Turn = ({
    turn,
    conversationStatus,
    composerHeight,
    pinnedTurnId,
    answerMinHeight = 0,
    isLastTurn = false,
}: TurnProps) => {
    const isOpen = !turn.finishedAt && !turn.end;
    const showLiveStatus = isOpen && ['processing', 'permission', 'error'].includes(conversationStatus);
    const showEnd = turn.end === 'stopped' || turn.end === 'error';
    const showStatus = showLiveStatus || showEnd;
    const showPanel = !isOpen && turn.persistedEvents.length > 0;
    const isPinnedTurn = pinnedTurnId === turn.turnId;
    const pinnedTurnStyle = isPinnedTurn ? { minHeight: answerMinHeight } : undefined;

    return (
        <div
            className={cn('relative py-lg border-b border-border', isLastTurn && 'border-b-0')}
            data-turn-id={turn.turnId}
            style={pinnedTurnStyle}>
            <Flex direction="column" gap="sm">
                <Animate>
                    <Flex direction="column" gap="md">
                        {turn.messages.map(message => (
                            <Message
                                key={message.turnId}
                                message={message}
                                finishedAt={turn.finishedAt}
                                isPinnedPrompt={isPinnedTurn && message.prompt !== undefined}
                            />
                        ))}
                    </Flex>
                </Animate>
            </Flex>

            {showPanel && <EventPanel composerHeight={composerHeight} events={turn.persistedEvents} />}

            {showStatus && (
                <Animate>
                    <Status events={turn.streamEvents} conversationStatus={conversationStatus} />
                </Animate>
            )}
        </div>
    );
};

export default Turn;
