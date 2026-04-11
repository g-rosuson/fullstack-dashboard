import React from 'react';

import { SelectProps } from './Select.types';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const Select = <V extends string>({ label, options, id, value, placeholder, onChange, className }: SelectProps<V>) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = options.find(o => o.value === e.target.value);
        onChange(selected);
    };

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{label}</Label>

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
