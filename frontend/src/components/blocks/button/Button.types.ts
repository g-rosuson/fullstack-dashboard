import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, MouseEventHandler, ReactElement } from 'react';

import { buttonVariants } from '@/components/ui/button';

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

type BaseProps = {
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    size?: ButtonSize;
    variant?: ButtonVariant;
    disabled?: boolean;
    isLoading?: boolean;
    fullWidth?: boolean;
    form?: string;
    pressed?: boolean;
    onClick?: MouseEventHandler<HTMLButtonElement>;
};

type LabelOnlyProps = {
    label: string;
    icon?: never;
    ariaLabel?: never;
};

type IconOnlyProps = {
    icon: ReactElement;
    ariaLabel: string;
    label?: never;
};

type IconAndLabelProps = {
    icon: ReactElement;
    label: string;
    ariaLabel?: never;
};

type ButtonProps = BaseProps & (LabelOnlyProps | IconOnlyProps | IconAndLabelProps);

export type { ButtonProps, ButtonSize, ButtonVariant };
