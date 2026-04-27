import { NavLink, useLocation } from 'react-router-dom';
import { BriefcaseBusiness, Home } from 'lucide-react';

import Text from '@/components/ui-app/text/Text';

import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import config from '@/config';

const Sidebar = () => {
    const { pathname } = useLocation();

    // Determine side-bar items
    const sidebarNavItems = [
        {
            label: 'Home',
            icon: Home,
            route: config.routes.root,
        },
        {
            label: 'Jobs',
            icon: BriefcaseBusiness,
            route: config.routes.jobs,
        },
    ];

    return (
        <ShadcnSidebar data-testid="sidebar" collapsible="offcanvas">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1">
                            {sidebarNavItems.map(item => {
                                const Icon = item.icon;
                                const isActive = pathname === item.route;

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <NavLink to={item.route}>
                                                <Icon />
                                                <Text size="s" appearance="foreground">
                                                    {item.label}
                                                </Text>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarRail />
        </ShadcnSidebar>
    );
};

export default Sidebar;
