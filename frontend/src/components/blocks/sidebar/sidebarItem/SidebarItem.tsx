import { Fragment, MouseEvent, ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import Flex from '@/components/blocks/flex/Flex';

import type { SidebarItem } from '../Sidebar.types';

import { textVariants } from '@/components/blocks/shared/variants/typography/text.variants';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const MenuItem = ({ item }: { item: SidebarItem }) => {
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
     * Wraps the children in a NavLink and adds the to prop.
     */
    const withLink = (children: ReactNode, to: string) => {
        return <NavLink to={to}>{children}</NavLink>;
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

    const isCollapsible = item.routes && item.routes.length > 0;
    const sidebarMenuItemButtonChild = (
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
    const sidebarMenuItemButtonChildWithLink = withLink(sidebarMenuItemButtonChild, item.to);
    const Container = isCollapsible ? Collapsible : Fragment;
    const containerProps = isCollapsible ? { open: state.isOpen, onClick: onOpenChange } : {};

    return (
        <Container
            key={item.to}
            {...containerProps}
            {...(isCollapsible ? { className: 'group/collapsible cursor-pointer' } : {})}>
            <SidebarMenuItem key={item.to} className="w-full">
                <SidebarMenuButton className={cn(textVariants({ size: 'sm' }), 'mb-xs')} asChild>
                    {isCollapsible ? sidebarMenuItemButtonChild : sidebarMenuItemButtonChildWithLink}
                </SidebarMenuButton>

                {isCollapsible && (
                    <CollapsibleContent>
                        <Flex direction="column" gap="xs">
                            {item.routes!.map(route => {
                                if (item.isLoading) {
                                    return <SidebarMenuSkeleton key={route.to} />;
                                }

                                return (
                                    <SidebarMenuSub key={route.to} className=" w-full border-none mx-0 px-0 py-0 pl-sm">
                                        <SidebarMenuSubItem>
                                            <SidebarMenuButton
                                                onClick={event => event.stopPropagation()}
                                                isActive={pathname === route.to}
                                                className={textVariants({ size: 'sm' })}
                                                asChild>
                                                <NavLink to={route.to}>
                                                    {route.icon && (
                                                        <div className="rounded-full p-1 bg-muted">
                                                            <route.icon />
                                                        </div>
                                                    )}

                                                    {route.label}
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                );
                            })}
                        </Flex>
                    </CollapsibleContent>
                )}
            </SidebarMenuItem>
        </Container>
    );
};

export default MenuItem;
