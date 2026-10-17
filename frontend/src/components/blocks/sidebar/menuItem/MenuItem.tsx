import { Fragment, MouseEvent, ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import SubMenuItem from './subMenuItem/SubMenuItem';
import Flex from '@/components/blocks/flex/Flex';

import type { SidebarItem } from '../Sidebar.types';

import { textVariants } from '@/components/blocks/shared/variants/typography/text.variants';
import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface MenuItemProps {
    item: SidebarItem;
    // eslint-disable-next-line no-unused-vars
    onConfirm: (itemId: string) => void;
}

const MenuItem = ({ item, onConfirm }: MenuItemProps) => {
    // State
    const [state, setState] = useState({
        isOpen: false,
    });

    // Hooks
    const { pathname } = useLocation();

    /**
     * Handles the open state change of the collapsible component.
     */
    const onOpenChange = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    };

    /**
     * Wraps a top level menu item in a NavLink that is active only on an exact path match.
     * This is used for non collapsible menu items.
     */
    const withLink = (children: ReactNode, to: string) => {
        return (
            <NavLink to={to} end>
                {children}
            </NavLink>
        );
    };

    /**
     * Opens the menu if the sub route is active on mount.
     */
    useEffect(() => {
        const isSubRouteActive = item.routes?.some(route => pathname.includes(route.to));

        if (isSubRouteActive) {
            setState(prev => ({ ...prev, isOpen: true }));
        }
    }, [item.routes, pathname]);

    // Determine if the menu item is collapsible
    const isCollapsible = item.routes && item.routes.length > 0;

    // Determine if the menu item is active
    const isCurrent = !isCollapsible && pathname === item.to;

    // Determine the container component and props
    const Container = isCollapsible ? Collapsible : Fragment;
    const containerProps = isCollapsible ? { open: state.isOpen } : {};

    // Determine the top level menu item
    const topLevelMenuItem = (
        <Flex justify="between" align="center">
            <Flex align="center" gap="xs">
                {item.icon && (
                    <div className="rounded-full bg-muted p-xs">
                        <item.icon />
                    </div>
                )}

                {item.label}
            </Flex>

            {isCollapsible && (
                <Button variant="ghost" size="icon" className="w-fit h-fit">
                    <ChevronDown className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
                </Button>
            )}
        </Flex>
    );

    const menuItem = isCollapsible ? (
        <div className="w-full cursor-pointer" onClick={onOpenChange}>
            {topLevelMenuItem}
        </div>
    ) : (
        withLink(topLevelMenuItem, item.to)
    );

    return (
        <Container key={item.to} {...containerProps} {...(isCollapsible ? { className: 'group/collapsible' } : {})}>
            <SidebarMenuItem key={item.to} className="w-full">
                <SidebarMenuButton isActive={isCurrent} className={cn(textVariants({ size: 'sm' }), 'mb-xs')} asChild>
                    {menuItem}
                </SidebarMenuButton>

                {isCollapsible && (
                    <SubMenuItem routes={item.routes!} isLoading={!!item.isLoading} onConfirm={onConfirm} />
                )}
            </SidebarMenuItem>
        </Container>
    );
};

export default MenuItem;
