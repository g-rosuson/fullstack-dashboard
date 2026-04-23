import type React from 'react';

/**
 * The props for the Field component.
 */
interface FieldProps {
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
    name: string;
    value: string | number;
    // eslint-disable-next-line no-unused-vars
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

export type { FieldProps };
