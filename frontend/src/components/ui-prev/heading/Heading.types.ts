import { ReactNode } from 'react';

type Props = {
    size?: 'xl' | 'l' | 'm' | 's';
    level: 1 | 2 | 3;
    children: ReactNode;
    removeMargin?: boolean;
}

export type {
    Props
}