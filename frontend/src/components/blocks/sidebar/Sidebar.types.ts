import type React from 'react';

interface SidebarRouteItem {
    label: string;
    to: string;
    icon?: React.ElementType;
    id: string;
    includeActions?: boolean;
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
    onConfirm: (itemId: string) => void;
}

export type { SidebarItem, SidebarProps, SidebarRouteItem };
