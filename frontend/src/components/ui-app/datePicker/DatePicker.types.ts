/**
 * The props for the DatePicker component.
 */
interface DatePickerProps {
    value: Date | undefined;
    label: string;
    onChange: (value: Date | null) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
}

export type { DatePickerProps };
