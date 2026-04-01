import React from 'react';

import { Props } from './Input.types';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Input: React.FC<Props> = ({ value, label, name, placeholder, type, onChange, testId, disabled, required }) => {
    const id = `${name}-field`;

    return (
        <div className="w-full">
            <Label htmlFor={id} className="mb-1.5">
                {label}
            </Label>

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
            />
        </div>
    );
};

export default Input;
