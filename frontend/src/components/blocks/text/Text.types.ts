import type { TypographySpacing } from '@/components/blocks/shared/variants/typography/spacing';
import type { TextVariants } from '@/components/blocks/shared/variants/typography/text.variants';
import type { ElementType, ReactNode } from 'react';

type TextProps = Omit<TextVariants, 'size' | 'spacing'> & {
    children: ReactNode;
    className?: string;
    as?: ElementType;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    spacing?: keyof TypographySpacing;
};

export type { TextProps };
