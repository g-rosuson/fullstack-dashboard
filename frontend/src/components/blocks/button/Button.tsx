import Spinner from '@/components/blocks/spinner/Spinner';

import type { ButtonProps } from './Button.types';
import type { ReactNode } from 'react';

import { Button as ButtonPrimitive } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Composes the shadcn button with a product content model: label, icon, loading, and width.
 */
const Button = (props: ButtonProps) => {
    const {
        type = 'button',
        size = 'md',
        variant,
        disabled,
        isLoading,
        fullWidth,
        form,
        pressed,
        icon,
        label,
        ariaLabel,
        onClick,
    } = props;

    let leading: ReactNode = icon;

    if (isLoading) {
        leading = <Spinner size={size} />;
    }

    return (
        <ButtonPrimitive
            type={type}
            variant={variant}
            size={size}
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-disabled={disabled || isLoading}
            aria-busy={isLoading}
            aria-label={ariaLabel}
            aria-pressed={pressed}
            form={form}
            className={cn(fullWidth && 'w-full')}>
            {leading}
            {label}
        </ButtonPrimitive>
    );
};

export default Button;
