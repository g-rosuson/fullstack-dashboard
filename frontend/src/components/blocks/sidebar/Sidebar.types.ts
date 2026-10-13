import type React from 'react';

interface SidebarRouteItem {
    label: string;
    to: string;
    icon?: React.ElementType;
}

interface SidebarItem {
    label: string;
    icon?: React.ElementType;
    to: string;
    routes?: SidebarRouteItem[];
    isLoading?: boolean;
}

interface SidebarProps {
    items: SidebarItem[];
    collapsible?: 'offcanvas' | 'icon' | 'none';
    className?: string;
}

export type { SidebarItem, SidebarProps, SidebarRouteItem };
