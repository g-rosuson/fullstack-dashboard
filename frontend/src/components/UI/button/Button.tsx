import clsx from 'clsx';

import Spinner from '../spinner/Spinner';

import { type Props } from './Button.types';

const Button = (props: Props) => {
    const { testId, type, variant, inline, disabled, hidden, isLoading, icon, ariaLabel, label, onClick } = props;

    let content = null;

    if (icon) {
        content = icon;
    }

    if (label) {
        content = label;
    }

    const className = clsx(
        'w-full overflow-hidden whitespace-nowrap rounded-md p-2 text-base font-medium text-foreground transition-colors select-none',
        'flex items-center justify-center',
        'hover:bg-surface-hover',
        'disabled:bg-muted disabled:hover:bg-muted',
        icon && 'text-3xl',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        inline && 'w-fit'
    );

    return (
        <button
            data-testid={testId}
            className={className}
            type={type}
            onClick={isLoading ? undefined : onClick}
            disabled={disabled || isLoading}
            hidden={hidden}
            aria-disabled={disabled || isLoading}
            aria-hidden={hidden}
            aria-busy={isLoading}
            aria-label={ariaLabel}>
            {isLoading ? <Spinner /> : content}
        </button>
    );
};

export default Button;
