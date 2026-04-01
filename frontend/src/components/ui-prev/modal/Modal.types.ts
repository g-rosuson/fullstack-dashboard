import type { ReactNode, RefObject } from 'react';

type DataAttributes = Record<`data-${string}`, string>

type ClickHandler = (() => Promise<void>) | (() => void);

export type Props = {
    open: boolean;
    close?: () => void;
    children: ReactNode;
    formRef?: RefObject<HTMLFormElement>;
    size?: 's' | 'm' | 'l' | 'xl';
    dataAttributes?: DataAttributes;
    primaryAction?: ClickHandler;
    primaryLabel?: string;
    secondaryAction?: ClickHandler;
    secondaryLabel?: string;
    enableForm?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    disableEscape?: boolean;
    disableClose?: boolean;
}