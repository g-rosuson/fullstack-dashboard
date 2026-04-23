import type { ButtonProps } from './Button.types';

import { Button as ShadcnButton } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

const Button = (props: ButtonProps) => {
    const { type, variant, disabled, hidden, isLoading, icon, ariaLabel, label, onClick } = props;

    const content = icon ?? label ?? null;

    return (
        <ShadcnButton
            type={type}
            variant={variant}
            size={icon ? 'icon' : 'default'}
            onClick={isLoading ? undefined : onClick}
            disabled={disabled || isLoading}
            hidden={hidden}
            aria-disabled={disabled || isLoading}
            aria-hidden={hidden}
            aria-busy={isLoading}
            aria-label={ariaLabel}>
            {isLoading ? <Spinner /> : content}
        </ShadcnButton>
    );
};

export default Button;
