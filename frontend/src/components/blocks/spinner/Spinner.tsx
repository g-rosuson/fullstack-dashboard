import { cva } from 'class-variance-authority';
import { Loader, Loader2Icon } from 'lucide-react';

import type { SpinnerProps } from './Spinner.types';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('', {
    variants: {
        size: {
            lg: 'size-(--icon-size-lg)',
            md: 'size-(--icon-size-md)',
            sm: 'size-(--icon-size-sm)',
            xs: 'size-(--icon-size-xs)',
        },
        variant: {
            primary: 'text-primary-foreground',
            foreground: 'text-foreground',
            muted: 'text-muted-foreground',
            success: 'text-success-foreground',
            warning: 'text-warning-foreground',
            destructive: 'text-destructive-foreground',
        },
        speed: {
            slow: 'animate-[spin_1.5s_linear_infinite]',
            medium: 'animate-spin',
            fast: 'animate-[spin_0.5s_linear_infinite]',
        },
    },
    defaultVariants: {
        size: 'md',
        variant: 'foreground',
        speed: 'medium',
    },
});

/**
 * Shows an in-progress status with named size, type, and speed.
 */
const Spinner = ({ size, type = 'circle', variant, speed, className }: SpinnerProps) => {
    const iconMap = {
        circle: Loader2Icon,
        dotted: Loader,
    };
    const Icon = iconMap[type];

    return (
        <Icon role="status" aria-label="Loading" className={cn(spinnerVariants({ size, variant, speed }), className)} />
    );
};

export default Spinner;

export type { SpinnerProps, SpinnerSize } from './Spinner.types';
