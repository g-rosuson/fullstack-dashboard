'use client';

import { useState } from 'react';

import type { ChangeEvent, RefObject } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ComposerTextareaProps {
    ref?: RefObject<HTMLTextAreaElement | null>;
    className?: string;
}

const Composer = ({ ref, className }: ComposerTextareaProps) => {
    const [prompt, setPrompt] = useState('');

    const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(event.target.value);
    };

    return (
        <Textarea
            ref={ref}
            value={prompt}
            onChange={onInputChange}
            placeholder="Enter prompt here..."
            className={cn(
                'w-auto max-h-60 min-h-8 border-border bg-surface resize-none text-sm dark:bg-surface',
                className
            )}
        />
    );
};

export default Composer;
