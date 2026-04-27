import React from 'react';
import { cva } from 'class-variance-authority';

import { HeadingProps } from './Heading.types';
import { cn } from '@/lib/utils';

export const headingVariants = cva('font-bold', {
    variants: {
        size: {
            xl: 'mb-6 text-4xl font-black',
            l: 'mb-3 text-xl',
            m: 'mb-2 text-base',
            s: 'mb-1 text-sm',
            xs: 'mb-1 text-xs',
        },
    },
    defaultVariants: {
        size: 'm',
    },
});

const Heading = ({ size, level, children, className, removeMargin = false }: HeadingProps) => {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

    return <Tag className={cn(headingVariants({ size }), className, removeMargin && 'mb-0')}>{children}</Tag>;
};

export default Heading;
