import type { ReactElement } from 'react';

/**
 * A menu item for the dropdown menu.
 */
type DropdownMenuItem = {
    label: string;
    onClick: () => void;
    icon?: ReactElement;
    variant?: 'default' | 'destructive';
};

/**
 * The props for the DropdownMenu content model.
 */
type DropdownMenuProps = {
    items: DropdownMenuItem[];
    trigger?: ReactElement;
    rounded?: boolean;
    triggerVariant?: 'outline' | 'default';
};

export type { DropdownMenuItem, DropdownMenuProps };
