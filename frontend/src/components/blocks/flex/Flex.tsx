import { cva } from 'class-variance-authority';

import type { FlexProps } from './Flex.types';

import { cn } from '@/lib/utils';

const flexVariants = cva('flex', {
    variants: {
        direction: {
            row: 'flex-row',
            column: 'flex-col',
        },
        justify: {
            start: 'justify-start',
            center: 'justify-center',
            end: 'justify-end',
            between: 'justify-between',
            around: 'justify-around',
        },
        align: {
            start: 'items-start',
            center: 'items-center',
            end: 'items-end',
            between: 'items-between',
            around: 'items-around',
            stretch: 'items-stretch',
        },
        gap: {
            xs: 'gap-xs',
            sm: 'gap-sm',
            md: 'gap-md',
            lg: 'gap-lg',
            xl: 'gap-xl',
        },
        wrap: {
            wrap: 'flex-wrap',
            nowrap: 'flex-nowrap',
        },
    },
    defaultVariants: {
        direction: 'row',
        justify: 'start',
        align: 'start',
        gap: 'sm',
        wrap: 'nowrap',
    },
});

/**
 * Stacks children in a row or column with named gap and alignment.
 */
const Flex = ({ children, className, direction, justify, wrap, align, as: Tag = 'div', gap }: FlexProps) => {
    return (
        <Tag className={cn(flexVariants({ direction, justify, wrap, align, gap }), 'w-full', className)}>
            {children}
        </Tag>
    );
};

Flex.displayName = 'Flex';

export default Flex;

export type { FlexGap, FlexProps } from './Flex.types';
