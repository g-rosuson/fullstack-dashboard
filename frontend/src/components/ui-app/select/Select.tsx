import React from 'react';

import { SelectProps } from './Select.types';
import { FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const Select = <V extends string>({ label, options, id, value, placeholder, onChange, className }: SelectProps<V>) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = options.find(o => o.value === e.target.value);
        onChange(selected);
    };

    return (
        <div className="w-full flex flex-col gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>

            <NativeSelect id={id} value={value} onChange={handleChange} className={className}>
                <NativeSelectOption value="">{placeholder}</NativeSelectOption>

                {options.map(option => (
                    <NativeSelectOption key={option.value} value={option.value}>
                        {option.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </div>
    );
};

export default Select;
