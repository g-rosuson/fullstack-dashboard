import Animate from '../animate/Animate';
import MenuItem from './sidebarItem/SidebarItem';

import type { SidebarProps } from './Sidebar.types';

import {
    Sidebar as SidebarPrimitive,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
} from '@/components/ui/sidebar';

/**
 * Composes the shadcn sidebar with a product content model: labelled destinations and collapse.
 */
const Sidebar = ({ items, collapsible = 'offcanvas', className }: SidebarProps) => {
    const sidebarItems = items.map(item => {
        return <MenuItem key={item.to} item={item} />;
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
