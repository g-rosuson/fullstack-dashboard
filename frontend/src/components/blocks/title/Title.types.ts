import React from 'react';

import { TypographySpacing } from '@/components/blocks/shared/variants/typography/spacing';
import { TitleVariants } from '@/components/blocks/shared/variants/typography/title.variants';

type Level = 1 | 2 | 3 | 4 | 5 | 6;

type TitleProps = Omit<TitleVariants, 'size' | 'spacing'> & {
    level: Level;
    children: React.ReactNode;
    variant?: 'muted' | 'foreground';
    weight?: 'bold' | 'medium' | 'regular' | 'light' | 'thin';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    spacing?: keyof TypographySpacing;
    className?: string;
    truncate?: boolean;
};

export type { TitleProps };
