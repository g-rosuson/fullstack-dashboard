import { ChangeEvent } from 'react';

type InputType = 'text' | 'password' | 'email' | 'number' | 'date';

export type Props =  {
    value: string;
    label: string;
    name: string;
    placeholder: string;
    type: InputType;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    testId?: string;
    disabled?: boolean;
    required?: boolean;
}