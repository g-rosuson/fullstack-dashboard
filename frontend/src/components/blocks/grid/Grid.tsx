import { cva } from 'class-variance-authority';

import type { GridProps } from './Grid.types';

import { cn } from '@/lib/utils';

const gridVariants = cva('grid', {
    variants: {
        columns: {
            1: 'grid-cols-1',
            2: 'grid-cols-2',
            3: 'grid-cols-3',
            4: 'grid-cols-4',
            5: 'grid-cols-5',
            6: 'grid-cols-6',
        },
        gap: {
            xs: 'gap-xs',
            sm: 'gap-sm',
            md: 'gap-md',
            lg: 'gap-lg',
            xl: 'gap-xl',
        },
        minItemWidth: {
            xs: 'grid-cols-autofill-xs',
            sm: 'grid-cols-autofill-sm',
            md: 'grid-cols-autofill-md',
            lg: 'grid-cols-autofill-lg',
        },
    },
    defaultVariants: {
        gap: 'md',
    },
});

/**
 * Lays out children in columns with named gap.
 */
const Grid = ({ children, className, gap, as: Tag = 'div', minItemWidth, columns }: GridProps) => {
    return (
        <Tag
            className={cn(gridVariants({ columns: minItemWidth ? undefined : columns, gap, minItemWidth }), className)}>
            {children}
        </Tag>
    );
};

Grid.displayName = 'Grid';

export default Grid;

export type { GridGap, GridProps, GridSize } from './Grid.types';
