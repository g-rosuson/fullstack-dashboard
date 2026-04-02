import { ReactNode } from 'react';

type Action = {
    label: string;
    icon: ReactNode;
    action: () => Promise<void> | void;
};

type Props = {
    email: string;
    actions: Action[];
};

export type { Action, Props };
