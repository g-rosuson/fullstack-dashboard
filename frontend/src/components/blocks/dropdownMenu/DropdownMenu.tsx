import { Fragment, type MouseEvent } from 'react';
import { EllipsisIcon } from 'lucide-react';

import type { DropdownMenuProps } from './DropdownMenu.types';

import {
    DropdownMenu as DropdownMenuPrimitive,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Composes the shadcn dropdown menu with a product content model: trigger and labelled actions.
 */
const DropdownMenu = ({ items, trigger }: DropdownMenuProps) => {
    let dropdownMenuTrigger = <EllipsisIcon size={18} />;

    if (trigger) {
        dropdownMenuTrigger = trigger;
    }

    /**
     * Stops the menu item click from bubbling (e.g. a parent card) and invokes the item action.
     */
    const onMenuItemClick = (event: MouseEvent<HTMLDivElement>, onClick: () => void) => {
        event.stopPropagation();
        onClick();
    };

    return (
        <DropdownMenuPrimitive>
            <DropdownMenuTrigger aria-label="Dropdown menu trigger" className="hover:bg-muted rounded-full p-xs">
                {dropdownMenuTrigger}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {items.map((item, index) => {
                    const isDestructive = item.variant === 'destructive';
                    const addSeparator = !isDestructive && index > 0;

                    return (
                        <Fragment key={item.label}>
                            {addSeparator && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={e => onMenuItemClick(e, item.onClick)}
                                variant={item.variant}>
                                {item.icon}
                                {item.label}
                            </DropdownMenuItem>
                        </Fragment>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenuPrimitive>
    );
};

export default DropdownMenu;

export type { DropdownMenuItem, DropdownMenuProps } from './DropdownMenu.types';
