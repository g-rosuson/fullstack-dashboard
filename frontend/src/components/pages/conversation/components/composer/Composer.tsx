import React from 'react';

import Flex from '@/components/blocks/flex/Flex';

import { Field, FieldLabel } from '@/components/ui/field';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from '@/components/ui/input-group';

interface ComposerProps {
    value: string;
    placeholder: string;
    label: string;
    button: {
        label?: string;
        name: string;
        icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
    };
    maxLength: number;
    variant: 'default' | 'destructive';
    disabled?: boolean;
    buttonDisabled?: boolean;
    // eslint-disable-next-line no-unused-vars
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    // eslint-disable-next-line no-unused-vars
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onClick: () => void;
}

export default function Composer({
    value,
    placeholder,
    label,
    button,
    maxLength,
    disabled,
    buttonDisabled,
    variant = 'default',
    onChange,
    onKeyDown,
    onClick,
}: ComposerProps) {
    const wordCount = value ? value.length : 0;

    return (
        <Field className="bg-surface rounded-lg">
            <FieldLabel className="sr-only" htmlFor="block-end-textarea">
                {label}
            </FieldLabel>

            <InputGroup>
                <InputGroupTextarea
                    value={value}
                    id="block-end-textarea"
                    placeholder={placeholder}
                    className="bg-surface rounded-lg"
                    disabled={disabled}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />

                <InputGroupAddon align="block-end">
                    <InputGroupText>
                        {wordCount}/{maxLength ?? '∞'}
                    </InputGroupText>

                    <InputGroupButton
                        variant={variant}
                        size="sm"
                        className="ml-auto"
                        aria-label={button.name}
                        disabled={disabled || buttonDisabled}
                        onClick={onClick}>
                        <Flex gap="sm">
                            <button.icon fill="currentColor" />

                            {button.label}
                        </Flex>
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </Field>
    );
}
