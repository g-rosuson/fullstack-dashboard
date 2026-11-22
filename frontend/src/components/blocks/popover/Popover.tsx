import { useCallback, useRef } from 'react';

import type { PopoverProps } from './Popover.types';

import { Popover as PopoverPrimitive, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Composes the shadcn popover with a product content model: trigger, content, and open state.
 */
const Popover = ({
    trigger,
    content,
    triggerMode = 'click',
    open,
    onOpenChange,
    hoverOpenDelay = 0,
    hoverCloseDelay = 100,
    align = 'center',
    side,
    sideOffset,
    triggerClassName,
    contentClassName,
    asChild,
}: PopoverProps) => {
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setOpen = useCallback((next: boolean) => onOpenChange(next), [onOpenChange]);

    const clearTimers = () => {
        if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    };

    const handleMouseEnter = () => {
        if (triggerMode !== 'hover') return;
        clearTimers();
        openTimerRef.current = setTimeout(() => setOpen(true), hoverOpenDelay);
    };

    const handleMouseLeave = () => {
        if (triggerMode !== 'hover') return;
        clearTimers();
        closeTimerRef.current = setTimeout(() => setOpen(false), hoverCloseDelay);
    };

    return (
        <PopoverPrimitive open={open} onOpenChange={triggerMode === 'click' ? setOpen : undefined}>
            <PopoverTrigger asChild={asChild} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <span className={cn('inline-flex', triggerClassName)}>{trigger}</span>
            </PopoverTrigger>

            <PopoverContent
                align={align}
                side={side}
                sideOffset={sideOffset}
                className={cn('bg-muted w-fit max-w-sm', contentClassName)}
                onMouseEnter={triggerMode === 'hover' ? handleMouseEnter : undefined}
                onMouseLeave={triggerMode === 'hover' ? handleMouseLeave : undefined}
                onOpenAutoFocus={triggerMode === 'hover' ? e => e.preventDefault() : undefined}
                onCloseAutoFocus={triggerMode === 'hover' ? e => e.preventDefault() : undefined}>
                {content}
            </PopoverContent>
        </PopoverPrimitive>
    );
};

export default Popover;

export type { PopoverProps, PopoverTriggerMode } from './Popover.types';
