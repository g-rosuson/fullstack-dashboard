import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Sheet as SheetPrimitive, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const sheetVariants = cva('p-4', {
    variants: {
        width: {
            quarter: 'data-[side=right]:w-1/4 data-[side=right]:sm:max-w-none',
            third: 'data-[side=right]:w-1/3 data-[side=right]:sm:max-w-none',
            half: 'data-[side=right]:w-1/2 data-[side=right]:sm:max-w-none',
            full: 'data-[side=right]:w-full data-[side=right]:sm:max-w-none',
        },
    },
    defaultVariants: {
        width: 'third',
    },
});

type Props = VariantProps<typeof sheetVariants> &
    React.ComponentProps<typeof SheetPrimitive> & {
        children: React.ReactNode;
        contentClassName?: string;
    };

const Sheet = ({ width, children, contentClassName, ...props }: Props) => {
    return (
        <SheetPrimitive {...props}>
            <SheetContent className={cn(sheetVariants({ width }), contentClassName)}>{children}</SheetContent>
        </SheetPrimitive>
    );
};

export default Sheet;
