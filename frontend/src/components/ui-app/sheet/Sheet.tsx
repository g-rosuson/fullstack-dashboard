import React from 'react';

import type { SheetProps } from './Sheet.types';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Sheet as SheetPrimitive, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const Sheet = ({
    children,
    className,
    enableForm,
    onFormSubmit,
    onPrimaryButtonClick,
    isSubmitting,
    primaryButtonLabel,
    side = 'right',
    ...props
}: SheetProps) => {
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onFormSubmit?.(e);
    };

    const footer = (
        <DialogFooter className="sticky bottom-0 left-0 right-0 rounded-none mt-6" showCloseButton>
            {primaryButtonLabel && (
                <Button
                    type={enableForm ? 'submit' : 'button'}
                    variant="default"
                    disabled={isSubmitting}
                    {...(!enableForm && { onClick: e => onPrimaryButtonClick?.(e) })}>
                    {isSubmitting ? <Spinner /> : primaryButtonLabel}
                </Button>
            )}
        </DialogFooter>
    );

    const inner = enableForm ? (
        <form onSubmit={onSubmit} className="h-full grid grid-rows-[1fr_auto]">
            {children}
            {footer}
        </form>
    ) : (
        <div className="h-full grid grid-rows-[1fr_auto]">
            {children}
            {footer}
        </div>
    );

    const baseClassName = 'overflow-scroll p-4 pb-0';

    return (
        <SheetPrimitive {...props}>
            <SheetContent className={cn(baseClassName, className)} side={side}>{inner}</SheetContent>
        </SheetPrimitive>
    );
};

export default Sheet;
