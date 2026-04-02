import { type ButtonHTMLAttributes, type ReactElement } from 'react';
import { VariantProps } from 'class-variance-authority';

import { buttonVariants } from '@/components/ui/button';

/**
 * Button variant types
 */
type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];

/**
 * Base button props
 */
type BaseProps = {
    testId?: string;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    variant?: ButtonVariant;
    disabled?: boolean;
    hidden?: boolean;
    isLoading?: boolean;
    onClick?: () => void;
};

/**
 * Icon-only button props
 */
type IconButtonProps = {
    icon: ReactElement;
    ariaLabel: string;
    label?: never;
};

/**
 * Label-only button props
 */
type LabelButtonProps = {
    label: string;
    icon?: never;
    ariaLabel?: never;
};

type Props = (IconButtonProps | LabelButtonProps) & BaseProps;

export type { BaseProps, Props };
