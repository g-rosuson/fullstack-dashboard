import React from 'react';

import { Props } from './Input.types';

const Input: React.FC<Props> = ({ value, label, name, placeholder, type, onChange, testId, disabled, required }) => {
    const id = `${label}_${Date.now()}`;
    const labelClassName = 'mb-1.5 block text-sm font-medium text-foreground';
    const inputClassName =
        'w-full rounded-md border border-border bg-background px-4 py-3 text-base text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-muted';

    return (
        <div className="w-full">
            <label htmlFor={id} className={labelClassName}>
                {label}
            </label>

            <input
                id={id}
                className={inputClassName}
                value={value}
                type={type}
                name={name}
                placeholder={placeholder}
                data-testid={testId}
                onChange={onChange}
                disabled={disabled}
                required={required}
                aria-disabled={disabled}
                aria-required={required}
            />
        </div>
    );
};

export default Input;
