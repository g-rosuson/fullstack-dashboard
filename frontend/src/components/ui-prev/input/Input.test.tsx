import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Input from './Input';
import { Props } from './Input.types';

/**
 * Renders a controlled input element into the JS-DOM.
 */
const setupControlledInput = () => {
    const ControlledInputComponent = () => {
        // State
        const [value, setValue] = useState('');

        /**
         * Sets the new value of the input element in the state.
         */
        const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
            setValue(event.target.value);
        };
    
        return (
            <Input
                value={value}
                label="Test"
                name="test"
                placeholder="Test"
                type="text"
                onChange={changeHandler}
                testId="input"
            />
        );
    };

    render(<ControlledInputComponent />);
}


/**
 * Renders the input with the given props into the JS-DOM and returns testing utilities.
 */
const setupInput = (props: Partial<Props> = {}) => {
    const tmpProps: Props = {
        value: 'test-value',
        label: 'Test-label',
        name: 'test-name',
        placeholder: 'Test-placeholder',
        type: 'text',
        onChange: () => null,
    };

    return render(<Input {...tmpProps} {...props} testId="input"/>);
};

/**
 * Test cases for the Input component.
 */
describe('Input component', () => {
    // Test input element
    it('is input HTML element', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).toBeInstanceOf(HTMLInputElement);
    });

    it('has the correct value', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).toHaveValue('test-value');
    });

    it('has the correct name', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).toHaveAttribute('name', 'test-name');
    });

    it('has the correct placeholder', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).toHaveAttribute('placeholder', 'Test-placeholder');
    });

    it('is disabled when the "disabled" prop is true', () => {
        const { getByRole } = setupInput({ disabled: true });
        expect(getByRole('textbox')).toBeDisabled();
    });

    it('is enabled when the "disabled" prop is false', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).not.toBeDisabled();
    });

    it('is enabled when the "disabled" prop is undefined', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).not.toBeDisabled();
    });

    it('is required when the "required" prop is true', () => {
        const { getByRole } = setupInput({ required: true });
        expect(getByRole('textbox')).toHaveAttribute('required');
    });

    it('is not required when the "required" prop is false', () => {
        const { getByRole } = setupInput({ required: false });
        expect(getByRole('textbox')).not.toHaveAttribute('required');
    });

    it('is not required when the "required" prop is undefined', () => {
        const { getByRole } = setupInput();
        expect(getByRole('textbox')).not.toHaveAttribute('required');
    });

    it('has the correct "type"', () => {
        setupInput({ type: 'password' as const });
        expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('receives the correct value from parent component', async () => {
        setupControlledInput();
        const input = screen.getByTestId('input');
        await userEvent.type(input, 'new value');
        expect(input).toHaveValue('new value');
    });

    // Test label element
    it('has a label HTML element', () => {
        const { container } = setupInput();
        const label = within(container).getByText('Test-label');
        expect(label).toBeInstanceOf(HTMLLabelElement);
        expect(label).toBeInTheDocument();
    });

    it('label element has the correct text content', () => {
        const { getByText } = setupInput();
        expect(getByText('Test-label')).toBeInTheDocument();
    });

    it('label element is correctly associated with the input', () => {
        const { container } = setupInput();
        const input = within(container).getByRole('textbox');
        const label = within(container).getByText('Test-label');
        expect(label).toHaveAttribute('for', input.id);
    });

    // Test the "aria-disabled" attribute
    it('sets "aria-disabled" to true when the disabled prop is true', () => {
        const { getByRole } = setupInput({ disabled: true });
        expect(getByRole('textbox')).toHaveAttribute('aria-disabled', 'true');
    });

    it('sets "aria-disabled" to false when the disabled prop is false', () => {
        const { getByRole } = setupInput({ disabled: false });
        expect(getByRole('textbox')).toHaveAttribute('aria-disabled', 'false');
    });

    // Test the "aria-required" attribute
    it('sets "aria-required" to true when the required prop is true', () => {
        const { getByRole } = setupInput({ required: true });
        expect(getByRole('textbox')).toHaveAttribute('aria-required', 'true');
    });

    it('sets "aria-required" to false when the required prop is false', () => {
        const { getByRole } = setupInput({ required: false });
        expect(getByRole('textbox')).toHaveAttribute('aria-required', 'false');
    });
});