/**
 * The props for the Select component.
 */
interface SelectOption<V extends string = string> {
    value: V;
    label: string;
}

/**
 * The props for the Select component.
 */
interface SelectProps<V extends string> {
    label: string;
    options: ReadonlyArray<SelectOption<V>>;
    id: string;
    value: V | string;
    placeholder: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (option: SelectOption<V> | undefined) => void;
    className?: string;
}

export type { SelectProps };
