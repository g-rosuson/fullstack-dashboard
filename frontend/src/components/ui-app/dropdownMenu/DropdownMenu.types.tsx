import React from 'react';

/**
 * A menu item for the dropdown menu.
 */
interface MenuItem {
    label: string;
    onClick: () => void;
    icon?: React.ReactElement;
    variant?: 'default' | 'destructive';
}

/**
 * The props for the DropdownMenu component.
 */
interface DropdownMenuProps {
    dropdownItems: MenuItem[];
    trigger?: React.ReactElement;
}

export type { DropdownMenuProps };
