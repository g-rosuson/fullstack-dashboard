import React from 'react';

import type { FieldProps } from './Field.types';

import { Field as ShadcnField, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * A standard field component for the tool dialog.
 */
const Field: React.FC<FieldProps> = ({ label, type, placeholder, required, name, value, onChange, disabled }) => {
    const id = `${name}-field`;

    return (
        <ShadcnField>
            <FieldLabel htmlFor={id} className="gap-0.5">
                {label}
                {required && <span className="text-destructive">*</span>}
            </FieldLabel>
            <Input
                name={name}
                value={value}
                id={id}
                type={type}
                placeholder={placeholder}
                required={required}
                onChange={onChange}
                disabled={disabled}
            />
        </ShadcnField>
    );
};

export default Field;
