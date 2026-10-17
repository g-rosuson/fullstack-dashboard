import { useLocation, useNavigate } from 'react-router-dom';
import { TrashIcon } from 'lucide-react';

import DropdownMenu from '@/components/blocks/dropdownMenu/DropdownMenu';
import Flex from '@/components/blocks/flex/Flex';

import type { SidebarRouteItem } from '../../Sidebar.types';
import type { MouseEvent } from 'react';

import { textVariants } from '@/components/blocks/shared/variants/typography/text.variants';
import { CollapsibleContent } from '@/components/ui/collapsible';
import { SidebarMenuButton, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import constants from '@/shared/constants';

interface SubMenuItemProps {
    routes: SidebarRouteItem[];
    isLoading: boolean;
    // eslint-disable-next-line no-unused-vars
    onConfirm: (itemId: string) => void;
}

const SubMenuItem = ({ routes, isLoading, onConfirm }: SubMenuItemProps) => {
    // Hooks
    const { pathname } = useLocation();
    const navigate = useNavigate();

    /**
     * Handles the click event for a sidebar menu item.
     * @param event - The click event.
     * @param to - The target route.
     */
    const handleClick = (event: MouseEvent<HTMLDivElement>, to: string) => {
        event.preventDefault();
        navigate(to);
    };

    return (
        <CollapsibleContent>
            <Flex direction="column" gap="xs">
                {routes.map(route => {
                    if (isLoading) {
                        return <SidebarMenuSkeleton key={route.to} />;
                    }

                    const dropdownMenuItems = [
                        {
                            label: constants.ui.button.label.delete,
                            icon: <TrashIcon />,
                            onClick: () => onConfirm(route.id),
                            variant: 'destructive' as const,
                        },
                    ];

                    const includeActions = route.includeActions === false ? false : true;

                    return (
                        <SidebarMenuSub key={route.to} className="w-full min-w-0 border-none mx-0 px-0 py-0 pl-sm">
                            <SidebarMenuSubItem className="min-w-0">
                                <SidebarMenuButton
                                    isActive={pathname === route.to}
                                    className={textVariants({ size: 'sm' })}
                                    asChild>
                                    <Flex
                                        align="center"
                                        className="min-w-0 cursor-pointer"
                                        onClick={event => handleClick(event, route.to)}>
                                        <Flex align="center" gap="sm" className="min-w-0">
                                            {route.icon && (
                                                <div className="shrink-0 rounded-full p-1 bg-muted">
                                                    <route.icon />
                                                </div>
                                            )}

                                            <span className="min-w-0 truncate">{route.label}</span>
                                        </Flex>

                                        {includeActions && (
                                            <div className="shrink-0">
                                                <DropdownMenu items={dropdownMenuItems} />
                                            </div>
                                        )}
                                    </Flex>
                                </SidebarMenuButton>
                            </SidebarMenuSubItem>
                        </SidebarMenuSub>
                    );
                })}
            </Flex>
        </CollapsibleContent>
    );
};

export default SubMenuItem;
