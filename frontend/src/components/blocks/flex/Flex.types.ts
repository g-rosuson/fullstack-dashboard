import type { ComponentPropsWithoutRef, ElementType, MouseEvent, ReactNode, Ref } from 'react';

type FlexGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type FlexProps = {
    children: ReactNode;
    className?: string;
    direction?: 'row' | 'column';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    wrap?: 'wrap' | 'nowrap';
    align?: 'start' | 'center' | 'end' | 'between' | 'around' | 'stretch';
    as?: ElementType;
    gap?: FlexGap;
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
    ref?: Ref<HTMLElement>;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className' | 'onClick'>;

export type { FlexGap, FlexProps };
