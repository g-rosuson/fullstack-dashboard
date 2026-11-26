import { useState } from 'react';
import { Paperclip } from 'lucide-react';

import EventPanel from './eventPanel/EventPanel';
import Message from './message/Message';
import Status from './status/Status';
import Animate from '@/components/blocks/animate/Animate';
import Button from '@/components/blocks/button/Button';
import Collapsible from '@/components/blocks/collapsible/Collapsible';

import type { TurnWithMessages } from '../types';
import type { ConversationStatus } from '@/shared/types/conversation';

import constants from '../../constants';
import { cn } from '@/lib/utils';
import storage from '@/services/storage';

interface TurnProps {
    conversationId: string;
    turn: TurnWithMessages;
    conversationStatus: ConversationStatus;
    composerHeight: number;
    pinnedTurnId?: string;
    answerMinHeight?: number;
    isLastTurn?: boolean;
    isAttached: boolean;
    revealTurnId?: string;
    // eslint-disable-next-line no-unused-vars
    onTurnIdChange: (turnId: string) => void;
}

const Turn = ({
    conversationId,
    turn,
    conversationStatus,
    composerHeight,
    pinnedTurnId,
    answerMinHeight = 0,
    isLastTurn = false,
    isAttached = false,
    revealTurnId,
    onTurnIdChange,
}: TurnProps) => {
    // State
    const [isTurnOpen, setIsTurnOpen] = useState(
        () => storage.ui.conversations.getTurnCollapsibleState(conversationId, turn.turnId) ?? true
    );

    /**
     * Handles the collapse change event for the turn.
     * @param open - Whether the turn is open or closed
     */
    const onTurnCollapseChange = (open: boolean) => {
        setIsTurnOpen(open);
        storage.ui.conversations.setTurnCollapsibleState(conversationId, turn.turnId, open);
    };

    /**
     * A chip click asks this turn to open. Setting that here, before paint,
     * puts the body in the commit that scrolls it. The turn stays open after the request is cleared.
     */
    if (revealTurnId === turn.turnId && !isTurnOpen) {
        onTurnCollapseChange(true);
    }

    // Computed/derived
    const isOpen = !turn.finishedAt && !turn.end;
    const showLiveStatus = isOpen && ['processing', 'permission', 'error'].includes(conversationStatus);
    const showEnd = turn.end === 'stopped' || turn.end === 'error';
    const showStatus = showLiveStatus || showEnd;
    const showPanel = turn.persistedEvents.length > 0;
    const isPinnedTurn = pinnedTurnId === turn.turnId;
    const pinnedTurnStyle = isPinnedTurn ? { minHeight: answerMinHeight } : undefined;
    const buttonAriaLabel = constants.turn.button.ariaLabel;
    const buttonVariant = isAttached ? 'default' : 'secondary';
    const promptLabel = turn.messages.find(message => message.prompt !== undefined)?.prompt;

    const action = (
        <Button
            icon={<Paperclip />}
            size="icon-sm"
            variant={buttonVariant}
            ariaLabel={buttonAriaLabel}
            pressed={isAttached}
            onClick={event => {
                // The attach control sits inside the collapse trigger. This click only changes the selection.
                event.preventDefault();
                event.stopPropagation();
                onTurnIdChange(turn.turnId);
            }}
        />
    );

    return (
        <Collapsible action={action} label={promptLabel} open={isTurnOpen} onOpenChange={onTurnCollapseChange}>
            <div
                className={cn('relative', isLastTurn && 'border-b-0')}
                data-turn-id={turn.turnId}
                style={pinnedTurnStyle}>
                <Animate>
                    {turn.messages.map(message => (
                        <Message
                            key={message.turnId}
                            message={message}
                            startedAt={turn.startedAt}
                            finishedAt={turn.finishedAt}
                            isPinnedPrompt={isPinnedTurn && message.prompt !== undefined}
                        />
                    ))}
                </Animate>

                {showStatus && <Status events={turn.streamEvents} conversationStatus={conversationStatus} />}

                {showPanel && <EventPanel composerHeight={composerHeight} events={turn.persistedEvents} />}
            </div>
        </Collapsible>
    );
};

export default Turn;
