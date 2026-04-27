import React from 'react';
import { cva, VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

type TextProps = VariantProps<typeof textVariants> & {
    size: VariantProps<typeof textVariants>['size'];
    children: React.ReactNode;
    className?: string;
    isParagraph?: boolean;
};

export const textVariants = cva('block', {
    variants: {
        size: {
            xs: 'text-xs',
            s: 'text-sm',
            m: 'text-base',
            l: 'text-lg',
        },
        appearance: {
            muted: 'text-muted-foreground',
            foreground: 'text-foreground',
        },
    },
    defaultVariants: {
        size: 'm',
        appearance: 'muted',
    },
});

const Text = ({ size, appearance, children, className, isParagraph = false }: TextProps) => {
    const Tag = isParagraph ? 'p' : 'span';
    return <Tag className={cn(textVariants({ size, appearance }), className)}>{children}</Tag>;
};

export default Text;
