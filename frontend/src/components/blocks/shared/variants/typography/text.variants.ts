import { cva, VariantProps } from 'class-variance-authority';

import { typographySpacing } from './spacing';

type TextVariants = VariantProps<typeof textVariants>;

const textVariants = cva('', {
    variants: {
        size: {
            xl: 'text-2xl',
            lg: 'text-lg',
            md: 'text-base',
            sm: 'text-sm',
            xs: 'text-xs',
        },
        spacing: typographySpacing,
        weight: {
            bold: 'font-bold',
            medium: 'font-medium',
            regular: 'font-normal',
            light: 'font-light',
            thin: 'font-thin',
        },
        align: {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
        },
        variant: {
            primary: 'text-primary-foreground',
            destructive: 'text-destructive-foreground',
            warning: 'text-warning-foreground',
            success: 'text-success-foreground',
            muted: 'text-muted-foreground',
            foreground: 'text-foreground',
        },
    },
    defaultVariants: {
        size: 'md',
        spacing: 'none',
        variant: 'foreground',
        weight: 'medium',
        align: 'left',
    },
});

export { textVariants };
export type { TextVariants };
