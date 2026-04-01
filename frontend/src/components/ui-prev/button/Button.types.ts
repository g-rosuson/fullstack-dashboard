import { type ButtonHTMLAttributes, type ReactElement } from 'react';

type BaseProps = {
    testId?: string;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    variant?: 'primary';
    disabled?: boolean;
    hidden?: boolean;
    isLoading?: boolean;
    onClick?: () => void;
};

// 1. Icon-only variant: must have ariaLabel
type IconButtonProps = {
    icon: ReactElement;
    ariaLabel: string;
    label?: never;
};

// 2. Label-only variant: no icon or ariaLabel allowed
type LabelButtonProps = {
    label: string;
    icon?: never;
    ariaLabel?: never;
};

type Props = (IconButtonProps | LabelButtonProps) & BaseProps;

export type { BaseProps, Props };
