import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, type Mock } from 'vitest';

import type { FieldProps } from './Field.types';

import Field from './Field';

const baseFieldProps: Pick<FieldProps, 'label' | 'name' | 'type' | 'placeholder' | 'onChange'> = {
    label: 'Email',
    name: 'email',
    type: 'text',
    placeholder: 'you@example.com',
    onChange: vi.fn(),
};

/**
 * Renders Field with fixed defaults and optional overrides into the JS-DOM.
 */
const renderField = (props: Partial<FieldProps> = {}) => {
    return render(
        <Field {...baseFieldProps} value="" {...props} onChange={props.onChange ?? baseFieldProps.onChange} />
    );
};

/**
 * Controlled wrapper so typing reflects real form behaviour for interaction tests.
 */
const ControlledField = ({
    initialValue = '',
    onChangeSpy,
    ...rest
}: Partial<FieldProps> & { initialValue?: string; onChangeSpy?: Mock<FieldProps['onChange']> }) => {
    const [value, setValue] = useState<string | number>(initialValue);

    const handleChange: FieldProps['onChange'] = event => {
        setValue(event.target.value);
        onChangeSpy?.(event);
    };

    return <Field {...baseFieldProps} {...rest} value={value} onChange={handleChange} />;
};

const textField = (name: RegExp) => screen.getByRole('textbox', { name }) as HTMLInputElement;

/**
 * Asserts the platform-linked label (same association users and AT rely on) shows or hides the required marker.
 */
const expectRequiredMarkerOnAssociatedLabel = (input: HTMLInputElement, visible: boolean) => {
    expect(input.labels).not.toBeNull();
    expect(input.labels).toHaveLength(1);
    const label = input.labels![0];
    expect(label).toBeDefined();

    if (visible) {
        expect(within(label).getByText('*')).toBeInTheDocument();
    } else {
        expect(within(label).queryByText('*')).not.toBeInTheDocument();
    }
};

describe('Field component', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('what the user sees', () => {
        // 1 — Label association / accessible name
        it('exposes the control under the label so it can be targeted by accessible name', () => {
            renderField({ label: 'Work email', name: 'workEmail', value: '' });

            expect(screen.getByRole('textbox', { name: /work email/i })).toBeInTheDocument();
        });

        // 2 — Placeholder
        it('shows the placeholder hint for an empty field', () => {
            renderField({ placeholder: 'name@company.com', value: '' });

            expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
        });

        // 3 — Displayed value (string and number)
        it('displays the current string value', () => {
            renderField({ value: 'ada@example.com' });

            expect(textField(/email/i)).toHaveValue('ada@example.com');
        });

        it('displays a numeric value for number fields', () => {
            renderField({
                label: 'Age',
                name: 'age',
                type: 'number',
                placeholder: '0',
                value: 42,
            });

            expect(screen.getByRole('spinbutton', { name: /age/i })).toHaveValue(42);
        });

        // 4 — Native input kind (browser behaviour: validation, password masking, etc.)
        it.each([
            ['text', { label: 'Title', name: 'title', type: 'text' as const }],
            ['email', { label: 'Contact', name: 'contact', type: 'email' as const }],
            ['password', { label: 'Secret', name: 'secret', type: 'password' as const }],
        ])('uses the %s input kind for the control', (_kind, overrides) => {
            renderField({ ...overrides, value: '' });

            const input = screen.getByLabelText(overrides.label);
            expect(input).toHaveAttribute('type', overrides.type);
        });

        // 5 — Required + visible indicator
        it('marks the field as required and shows a required indicator when required is true', () => {
            renderField({ required: true, value: '' });

            const input = textField(/email/i);
            expect(input).toBeRequired();
            expectRequiredMarkerOnAssociatedLabel(input, true);
        });

        // 6 — Optional field
        it.each([
            { scenario: 'required is false', props: { required: false as const } },
            { scenario: 'required is omitted', props: {} },
        ])('does not mark the field required and omits the asterisk when $scenario', ({ props }) => {
            renderField({ ...props, value: '' });

            const input = textField(/email/i);
            expect(input).not.toBeRequired();
            expectRequiredMarkerOnAssociatedLabel(input, false);
        });

        // 7 — Disabled
        it('prevents interaction when disabled is true', () => {
            renderField({ disabled: true, value: 'read-only' });

            expect(textField(/email/i)).toBeDisabled();
        });
    });

    describe('user input', () => {
        // 8 — Change events
        it('notifies listeners through onChange when the user types', async () => {
            const onChangeSpy = vi.fn();
            render(<ControlledField initialValue="" onChangeSpy={onChangeSpy} />);

            const input = textField(/email/i);
            await userEvent.type(input, 'hi');

            expect(onChangeSpy.mock.calls.at(-1)?.[0].target.value).toBe('hi');
            expect(input).toHaveValue('hi');
        });
    });

    describe('form behaviour', () => {
        // 9 — Name for form submission
        it('sets the input name so the control participates in form submission', () => {
            renderField({ name: 'user_email', value: '' });

            expect(textField(/email/i)).toHaveAttribute('name', 'user_email');
        });
    });
});
