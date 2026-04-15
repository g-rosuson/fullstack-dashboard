import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import Select from './Select';

/**
 * The options for the fruit select.
 */
const fruitOptions = [
    { value: 'apple', label: 'Apple' },
    { value: 'orange', label: 'Orange' },
] as const;

/**
 * The value type for the fruit select.
 */
type FruitValue = (typeof fruitOptions)[number]['value'];

/**
 * The default props for the fruit select.
 */
const defaultProps = {
    label: 'Favourite fruit',
    id: 'fruit-select',
    options: fruitOptions,
    value: '' as FruitValue | string,
    placeholder: 'Pick a fruit',
    onChange: vi.fn(),
};

/**
 * Renders Select with defaults into the JS-DOM.
 */
const renderSelect = (props: Partial<typeof defaultProps> = {}) => {
    const { onChange, ...rest } = props;
    return render(<Select<FruitValue> {...defaultProps} {...rest} onChange={onChange ?? defaultProps.onChange} />);
};

/**
 * Get the select control by label.
 */
const getSelectControl = (label: string = defaultProps.label) =>
    screen.getByRole('combobox', { name: label }) as HTMLSelectElement;

describe('Select component', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('what the user sees', () => {
        it('shows the label and exposes the control under that label', () => {
            renderSelect({ label: 'Country', id: 'country-select' });

            expect(screen.getByText('Country')).toBeInTheDocument();
            expect(getSelectControl('Country')).toBeInTheDocument();
        });

        it('lists the placeholder as the first choice and lists every option label', () => {
            renderSelect();

            const select = getSelectControl();
            const options = within(select).getAllByRole('option');

            expect(options[0]).toHaveValue('');
            expect(options[0]).toHaveTextContent('Pick a fruit');
            expect(within(select).getByRole('option', { name: 'Apple' })).toBeInTheDocument();
            expect(within(select).getByRole('option', { name: 'Orange' })).toBeInTheDocument();
        });

        it('shows the selected option’s label when value matches an option', () => {
            renderSelect({ value: 'orange' });

            expect(getSelectControl()).toHaveValue('orange');
            expect(getSelectControl()).toHaveDisplayValue('Orange');
        });

        it('shows the placeholder row when value is empty', () => {
            renderSelect({ value: '' });

            expect(getSelectControl()).toHaveValue('');
            expect(getSelectControl()).toHaveDisplayValue('Pick a fruit');
        });
    });

    describe('user input', () => {
        it('calls onChange with the full option object when the user picks an option', async () => {
            const onChangeSpy = vi.fn();
            renderSelect({ onChange: onChangeSpy, value: '' });

            await userEvent.selectOptions(getSelectControl(), 'apple');

            expect(onChangeSpy).toHaveBeenCalledWith({ value: 'apple', label: 'Apple' });
        });

        it('calls onChange with undefined when the user picks the placeholder', async () => {
            const onChangeSpy = vi.fn();
            renderSelect({ onChange: onChangeSpy, value: 'apple' });

            await userEvent.selectOptions(getSelectControl(), '');

            expect(onChangeSpy).toHaveBeenCalledWith(undefined);
        });
    });
});
