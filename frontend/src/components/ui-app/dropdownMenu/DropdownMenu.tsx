import { Fragment } from 'react';
import { EllipsisIcon } from 'lucide-react';

import { DropdownMenuProps } from './DropdownMenu.types';
import {
    DropdownMenu as DropdownMenuPrimitive,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DropdownMenu = ({ dropdownItems, trigger }: DropdownMenuProps) => {
    // Determine the trigger
    let dropdownMenuTrigger = <EllipsisIcon size={18} />;

    if (trigger) {
        dropdownMenuTrigger = trigger;
    }

    return (
        <DropdownMenuPrimitive>
            <DropdownMenuTrigger className="hover:bg-muted rounded-full p-1">{dropdownMenuTrigger}</DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                {dropdownItems.map(item => {
                    const addSeparator = item.variant === 'destructive';

                    return (
                        <Fragment key={item.label}>
                            {addSeparator && <DropdownMenuSeparator />}
                            <DropdownMenuItem className="cursor-pointer" onClick={item.onClick} variant={item.variant}>
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
