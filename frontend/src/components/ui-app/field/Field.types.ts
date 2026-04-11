import type React from 'react';

interface FieldProps {
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
    name: string;
    value: string | number;
    // eslint-disable-next-line no-unused-vars
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface KeyWordsFieldProps {
    label: string;
    name: string;
    value: string;
    required: boolean;
    placeholder: string;
    hasKeywords: boolean;
    // eslint-disable-next-line no-unused-vars
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    // eslint-disable-next-line no-unused-vars
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClick: () => void;
}

export type { FieldProps, KeyWordsFieldProps };
