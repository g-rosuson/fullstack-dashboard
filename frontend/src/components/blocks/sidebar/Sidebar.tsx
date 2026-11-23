import Animate from '../animate/Animate';
import MenuItem from './menuItem/MenuItem';

import type { SidebarProps } from './Sidebar.types';

import {
    Sidebar as SidebarPrimitive,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
} from '@/components/ui/sidebar';

const Sidebar = ({ items, collapsible = 'offcanvas', className, onConfirm }: SidebarProps) => {
    const sidebarItems = items.map(item => {
        return <MenuItem key={item.to} item={item} onConfirm={onConfirm} />;
    });

    return (
        <SidebarPrimitive collapsible={collapsible} className={className}>
            <Animate>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>{sidebarItems}</SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Animate>
        </SidebarPrimitive>
    );
};

export default Sidebar;

export type { SidebarItem, SidebarRouteItem } from './Sidebar.types';
