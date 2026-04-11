import React from 'react';

type Action = {
    label: string;
    icon: React.ReactElement;
    onClick: () => Promise<void> | void;
};

type Props = {
    email: string;
    actions: Action[];
};

export type { Action, Props };
