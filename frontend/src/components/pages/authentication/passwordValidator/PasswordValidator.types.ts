interface Props {
    password: string;
    confirmationPassword: string;
    onChange: (isValid: boolean) => void;
    hidden?: boolean;
}

export type { Props };
