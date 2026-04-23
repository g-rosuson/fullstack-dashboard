import React from 'react';
import { cva } from 'class-variance-authority';

import { HeadingProps } from './Heading.types';
import { cn } from '@/lib/utils';

export const headingVariants = cva('font-bold leading-none text-foreground', {
    variants: {
        size: {
            xl: 'mb-6 text-4xl font-black',
            l: 'mb-4 text-3xl',
            m: 'mb-2 text-base',
            s: 'mb-1 text-sm',
        },
    },
    defaultVariants: {
        size: 'xl',
    },
});

const Heading = ({ size, level, children, className }: HeadingProps) => {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

    return <Tag className={cn(headingVariants({ size }), className)}>{children}</Tag>;
};

export default Heading;
