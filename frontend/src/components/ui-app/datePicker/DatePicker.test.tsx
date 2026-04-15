import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { afterEach, type Mock } from 'vitest';

import type { DatePickerProps } from './DatePicker.types';

import DatePicker from './DatePicker';

const defaultLabel = 'Start date';

/**
 * Renders DatePicker with defaults into the JS-DOM.
 */
const renderDatePicker = (props: Partial<DatePickerProps> & { onChange?: DatePickerProps['onChange'] } = {}) => {
    const onChange = props.onChange ?? vi.fn();

    return render(
        <DatePicker
            label={props.label ?? defaultLabel}
            value={props.value}
            onChange={onChange}
            placeholder={props.placeholder}
            disabled={props.disabled}
            required={props.required}
        />
    );
};

/**
 * Hidden text input used for HTML constraint validation (required + custom message).
 */
const getValidityInput = () => screen.getByRole('textbox', { hidden: true }) as HTMLInputElement;

/**
 * The trigger’s accessible name is the field label (label htmlFor → button id); when required, it includes “ *”.
 * Visible placeholder / formatted date are asserted with toHaveTextContent.
 */
const getDatePickerTrigger = (label: string = defaultLabel) => {
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return screen.getByRole('button', { name: new RegExp(escapeRegExp(label), 'i') }) as HTMLButtonElement;
};

/**
 * Clicks a day number in the displayed month (excludes “outside” days from adjacent months).
 */
const clickDayInVisibleMonth = async (grid: HTMLElement, dayOfMonth: number) => {
    const candidates = within(grid)
        .getAllByRole('button')
        .filter(btn => btn.textContent?.trim() === String(dayOfMonth));

    const inDisplayedMonth = candidates.find(
        btn => btn.closest('[role="gridcell"]')?.getAttribute('data-outside') !== 'true'
    );

    expect(inDisplayedMonth).toBeDefined();
    await userEvent.click(inDisplayedMonth!);
};

const expectRequiredMarkerOnAssociatedLabel = (button: HTMLButtonElement, visible: boolean) => {
    expect(button.labels).not.toBeNull();
    expect(button.labels).toHaveLength(1);
    const label = button.labels![0];
    expect(label).toBeDefined();

    if (visible) {
        expect(within(label).getByText('*')).toBeInTheDocument();
    } else {
        expect(within(label).queryByText('*')).not.toBeInTheDocument();
    }
};

/**
 * A controlled DatePicker component for testing.
 */
const ControlledDatePicker = ({
    initialValue,
    onChangeSpy,
    ...rest
}: Partial<DatePickerProps> & { initialValue?: Date | undefined; onChangeSpy?: Mock<DatePickerProps['onChange']> }) => {
    const [value, setValue] = useState<Date | undefined>(initialValue);

    const handleChange: DatePickerProps['onChange'] = next => {
        setValue(next ?? undefined);
        onChangeSpy?.(next);
    };

    return (
        <DatePicker
            label={rest.label ?? defaultLabel}
            value={value}
            onChange={handleChange}
            placeholder={rest.placeholder}
            disabled={rest.disabled}
            required={rest.required}
        />
    );
};

describe('DatePicker component', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('what the user sees', () => {
        it('shows the field label and links it to the date trigger', () => {
            renderDatePicker({ label: 'Due on', value: undefined });

            expect(screen.getByText('Due on')).toBeInTheDocument();

            const button = getDatePickerTrigger('Due on');
            expect(button.labels).not.toBeNull();
            expect(button.labels).toHaveLength(1);
            expect(button.labels![0]).toHaveTextContent('Due on');
        });

        it('shows the default placeholder on the trigger when no date is selected', () => {
            renderDatePicker({ value: undefined });

            expect(getDatePickerTrigger()).toHaveTextContent('Pick a date');
        });

        it('shows a custom placeholder when no date is selected', () => {
            renderDatePicker({ value: undefined, placeholder: 'Choose deadline' });

            expect(getDatePickerTrigger()).toHaveTextContent('Choose deadline');
        });

        it('shows the selected date in a readable long form on the trigger', () => {
            const value = new Date(2024, 5, 10);
            renderDatePicker({ value });

            expect(getDatePickerTrigger()).toHaveTextContent(format(value, 'PPP'));
        });

        it('marks the field required and shows a required indicator when required is true', () => {
            renderDatePicker({ value: undefined, required: true });

            const button = getDatePickerTrigger();
            expectRequiredMarkerOnAssociatedLabel(button, true);
            expect(getValidityInput()).toBeRequired();
        });

        it.each([
            { scenario: 'required is false', props: { required: false as const } },
            { scenario: 'required is omitted', props: {} },
        ])('does not mark the picker required and omits the asterisk when $scenario', ({ props }) => {
            renderDatePicker({ ...props, value: undefined });

            const button = getDatePickerTrigger();
            expectRequiredMarkerOnAssociatedLabel(button, false);
            expect(getValidityInput()).not.toBeRequired();
        });

        it('prevents opening the calendar when disabled is true', () => {
            renderDatePicker({ value: undefined, disabled: true });

            expect(getDatePickerTrigger()).toBeDisabled();
        });
    });

    describe('validation behaviour', () => {
        it('reports invalid while required and empty so forms can block submit', async () => {
            renderDatePicker({ value: undefined, required: true });

            await waitFor(() => {
                const input = getValidityInput();
                expect(input.checkValidity()).toBe(false);
                expect(input.validationMessage).toBe('Please select a date to continue');
            });
        });

        it('clears the custom validity message when a date is selected or required is off', async () => {
            const onChange = vi.fn();
            const { rerender } = render(
                <DatePicker label={defaultLabel} value={undefined} onChange={onChange} required />
            );

            await waitFor(() => {
                expect(getValidityInput().checkValidity()).toBe(false);
            });

            rerender(<DatePicker label={defaultLabel} value={new Date(2024, 0, 1)} onChange={onChange} required />);

            await waitFor(() => {
                expect(getValidityInput().checkValidity()).toBe(true);
            });
        });
    });

    describe('choosing a date', () => {
        it('calls onChange with the chosen day and closes the calendar', async () => {
            const onChangeSpy = vi.fn();
            render(
                <DatePicker label={defaultLabel} value={undefined} onChange={onChangeSpy} placeholder="Pick a date" />
            );

            await userEvent.click(getDatePickerTrigger());

            const grid = await screen.findByRole('grid');
            await clickDayInVisibleMonth(grid, 15);

            await waitFor(() => {
                expect(onChangeSpy).toHaveBeenCalledTimes(1);
                const arg = onChangeSpy.mock.calls[0][0];
                expect(arg).toBeInstanceOf(Date);
                expect(arg!.getDate()).toBe(15);
            });

            await waitFor(() => {
                expect(screen.queryByRole('grid')).not.toBeInTheDocument();
            });
        });

        it('updates the trigger label after selection when used as a controlled field', async () => {
            const onChangeSpy = vi.fn();
            render(<ControlledDatePicker initialValue={undefined} onChangeSpy={onChangeSpy} />);

            await userEvent.click(getDatePickerTrigger());
            const grid = await screen.findByRole('grid');
            await clickDayInVisibleMonth(grid, 20);

            await waitFor(() => {
                expect(onChangeSpy).toHaveBeenCalled();
            });

            const picked = onChangeSpy.mock.calls[0][0] as Date;
            expect(getDatePickerTrigger()).toHaveTextContent(format(picked, 'PPP'));
        });
    });
});
