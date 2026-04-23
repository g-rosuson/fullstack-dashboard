import type { ReactNode } from 'react';

/**
 * The props for the Tabs component.
 */
interface TabsProps {
    tabs: {
        value: string;
        label: string;
    }[];
    tabContents: {
        value: string;
        children: ReactNode;
    }[];
}

export type { TabsProps };
