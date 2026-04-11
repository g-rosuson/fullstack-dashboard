type SelectOption<V extends string = string> = {
    value: V;
    label: string;
};

interface SelectProps<V extends string> {
    label: string;
    options: ReadonlyArray<SelectOption<V>>;
    id: string;
    value: V | '';
    placeholder: string;
    // eslint-disable-next-line no-unused-vars
    onChange: (option: SelectOption<V> | undefined) => void;
    className?: string;
}

export type { SelectProps };
