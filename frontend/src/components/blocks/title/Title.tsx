import React from 'react';

import { TitleProps } from './Title.types';
import { titleVariants } from '@/components/blocks/shared/variants/typography/title.variants';
import { cn } from '@/lib/utils';

/**
 * Renders an h1–h6 with the shared title type scale.
 */
const Title = ({ size, spacing, level, variant, weight, children, className, truncate = false }: TitleProps) => {
    const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

    return (
        <Tag
            className={cn(
                titleVariants({ size, spacing, variant, weight }),
                className,
                'w-full',
                truncate && 'truncate'
            )}>
            {children}
        </Tag>
    );
};

Title.displayName = 'Title';

export default Title;
