import { Outlet } from 'react-router-dom';
import { Plus } from 'lucide-react';

import TopBar from '../topBar/TopBar';
import Sidebar, { SidebarItem, SidebarRouteItem } from '@/components/blocks/sidebar/Sidebar';

import constants from './constants';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import config from '@/config';
import { useChatSelection } from '@/store/selectors/chat';
import { useUserInterfaceSelection } from '@/store/selectors/ui';

const Dashboard = () => {
    const { isSidebarOpen, setSidebarOpen } = useUserInterfaceSelection();
    const { conversations, isFetchingConversations } = useChatSelection();

    const conversationsRoutes: SidebarRouteItem[] = [
        {
            label: constants.createConversationMenuItemLabel,
            to: config.routes.conversations.create,
            icon: Plus,
        },
    ];

    for (const conversation of conversations) {
        conversationsRoutes.push({
            label: conversation.conversationId,
            to: `${config.routes.conversations.base}/${conversation.conversationId}`,
        });
    }

    // Determine side-bar items
    const sidebarNavItems: SidebarItem[] = [
        {
            label: constants.homeMenuItemLabel,
            to: config.routes.root,
        },
        {
            label: constants.jobsMenuItemLabel,
            to: config.routes.jobs,
        },
        {
            label: constants.conversationsMenuItemLabel,
            to: config.routes.conversations.create,
            routes: conversationsRoutes,
            isLoading: isFetchingConversations,
        },
    ];

    return (
        <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
            <Sidebar items={sidebarNavItems} />

            <SidebarInset>
                <TopBar />

                <div className="h-full p-md">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default Dashboard;
