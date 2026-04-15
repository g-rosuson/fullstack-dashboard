import React from 'react';

import { Props } from './Input.types';
import { FieldLabel } from '@/components/ui/field';
import { Input as ShadcnInput } from '@/components/ui/input';

// TODO: Remove and only use custom Field right?
const Input: React.FC<Props> = props => {
    const { value, label, name, placeholder, type, className, onChange, testId, disabled, required } = props;
    const id = `${name}-field`;

    return (
        <div className="w-full">
            <FieldLabel htmlFor={id} className="gap-0.5">
                {label}
            </FieldLabel>

            <ShadcnInput
                id={id}
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
                className={className}
            />
        </div>
    );
};

export default Input;
