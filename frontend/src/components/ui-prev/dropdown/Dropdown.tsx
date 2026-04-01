import { type KeyboardEvent, useEffect, useRef } from 'react';
import clsx from 'clsx';

import { Props } from './Dropdown.types';

const Dropdown = ({ open, close, actions, controller, position }: Props) => {
    // Refs
    const menuRef = useRef<HTMLDivElement>(null);
    const containerClassName = 'relative';
    const dropdownBaseClassName =
        'absolute z-10 mt-1 w-max cursor-pointer overflow-hidden rounded-md border border-border bg-surface p-2 shadow-light';
    const dropdownClassName = clsx(dropdownBaseClassName, open ? 'opacity-100' : 'pointer-events-none opacity-0');
    const itemClassName =
        'flex items-center gap-1 p-2 text-base text-foreground transition-colors focus:bg-surface-hover focus:text-foreground focus:outline-1 focus:outline-primary hover:bg-surface-hover hover:text-foreground';
    const iconClassName = 'flex text-2xl';

    /**
     * Invokes a menu item action when the user presses Enter or Space.
     */
    const keyboardHandler = (event: KeyboardEvent<HTMLLIElement>, action: Function) => {
        if (event.key === 'Enter' || event.key === ' ') {
            // Prevent scrolling when the space key is pressed
            event.preventDefault();
            action();
        }
    };

    /**
     * Attaches an event listener when the menu is open, and
     * removes the listener when the component unmounts.
     */
    useEffect(() => {
        /**
         * Closes the menu when the user clicks outside it.
         */
        const clickOutsideHandler = (event: Event) => {
            if (!menuRef.current?.contains(event.target as Element)) {
                close();
            }
        };

        if (open) {
            window.addEventListener('click', clickOutsideHandler);
        }

        return () => {
            window.removeEventListener('click', clickOutsideHandler);
        };
    }, [close, open]);

    return (
        <div ref={menuRef} className={containerClassName}>
            {controller}

            <ul
                className={dropdownClassName}
                style={position}
                role="menu"
                hidden={!open}
                aria-expanded={open}
                aria-label="User menu"
                aria-hidden={!open}>
                {actions.map(({ label, icon, action }) => (
                    <li
                        key={label}
                        className={itemClassName}
                        role="menuitem"
                        tabIndex={open ? 0 : -1}
                        onClick={action}
                        onKeyDown={event => keyboardHandler(event, action)}>
                        {/* Icon is decorative only, so hide it from screen readers */}
                        <div aria-hidden="true" className={iconClassName}>
                            {icon}
                        </div>

                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dropdown;
