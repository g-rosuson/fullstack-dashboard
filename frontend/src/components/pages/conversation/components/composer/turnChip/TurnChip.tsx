import { useState } from 'react';
import { X } from 'lucide-react';

import Button from '@/components/blocks/button/Button';
import Flex from '@/components/blocks/flex/Flex';
import Popover from '@/components/blocks/popover/Popover';
import Text from '@/components/blocks/text/Text';

import type { TurnChipProps } from './TurnChip.types';

import constants from '@/components/pages/conversation/constants';

/**
 * One attached turn. Hover shows the full prompt. The remove control stays outside that trigger.
 */
const TurnChip = ({ turn, onAttachedTurnClick, onRemoveTurn }: TurnChipProps) => {
    // State
    const [open, setOpen] = useState(false);

    return (
        <Flex
            gap="xs"
            align="center"
            className="bg-primary rounded-sm pl-sm pr-xs py-xs cursor-pointer hover:not-has-[[data-slot=button]:hover]:bg-primary-hover"
            onClick={() => onAttachedTurnClick(turn.turnId)}>
            <Popover
                triggerMode="hover"
                open={open}
                onOpenChange={setOpen}
                asChild
                side="top"
                triggerClassName="min-w-0 flex-1"
                contentClassName="whitespace-normal text-left"
                trigger={
                    <Text weight="bold" size="xs" className="min-w-0 truncate text-primary-foreground">
                        {turn.prompt}
                    </Text>
                }
                content={
                    <Text weight="bold" size="xs" className="whitespace-normal">
                        {turn.prompt}
                    </Text>
                }
            />

            <Button
                size="icon-xs"
                ariaLabel={constants.composer.removeTurn}
                icon={<X />}
                onClick={event => {
                    event.stopPropagation();
                    onRemoveTurn(turn.turnId);
                }}
            />
        </Flex>
    );
};

export default TurnChip;

export type { AttachedTurn, TurnChipProps } from './TurnChip.types';
