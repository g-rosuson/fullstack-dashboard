'use client';

import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ComposerTextareaProps {
    ref?: RefObject<HTMLTextAreaElement | null>;
    className?: string;
    value: string;
    // eslint-disable-next-line no-unused-vars
    onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    // eslint-disable-next-line no-unused-vars
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

const Composer = ({ ref, className, value, onInputChange, onKeyDown, disabled }: ComposerTextareaProps) => {
    return (
        <Textarea
            ref={ref}
            disabled={disabled}
            aria-disabled={disabled}
            value={value}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Enter prompt here..."
            className={cn(
                'w-auto max-h-60 min-h-8 border-border bg-surface resize-none text-sm dark:bg-surface',
                className
            )}
        />
    );
};

export default Composer;
