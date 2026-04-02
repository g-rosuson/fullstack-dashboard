import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const headingVariants = cva('font-bold leading-none text-foreground', {
    variants: {
        size: {
            xl: 'mb-6 text-4xl font-black',
            l: 'mb-4 text-3xl',
            m: 'mb-2 text-lg',
            s: 'mb-1 text-sm',
        },
    },
    defaultVariants: {
        size: 'xl',
    },
});

type Level = 1 | 2 | 3;

type Props = VariantProps<typeof headingVariants> & {
    level: Level;
    children: React.ReactNode;
    className?: string;
};

const Heading = ({ size, level, children, className }: Props) => {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

    return <Tag className={cn(headingVariants({ size }), className)}>{children}</Tag>;
};

export default Heading;
