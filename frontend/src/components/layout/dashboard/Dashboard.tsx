import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Plus } from 'lucide-react';

import TopBar from '../topBar/TopBar';
import ConfirmationDialog from '@/components/blocks/confirmationDialog/ConfirmationDialog';
import Sidebar, { SidebarItem, SidebarRouteItem } from '@/components/blocks/sidebar/Sidebar';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import localConstants from './constants';
import api from '@/api';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import config from '@/config';
import logging from '@/services/logging';
import constants from '@/shared/constants';
import { useChatSelection } from '@/store/selectors/chat';
import { useUserInterfaceSelection } from '@/store/selectors/ui';
import string from '@/utils/string';

interface DashboardState {
    confirmationTargetId: string | null;
}

const Dashboard = () => {
    // State
    const [state, setState] = useState<DashboardState>({
        confirmationTargetId: null,
    });

    // Store
    const { isSidebarOpen, setSidebarOpen } = useUserInterfaceSelection();
    const { conversations, isFetchingConversations, removeConversation } = useChatSelection();

    /**
     * Closes the confirmation dialog.
     */
    const onCloseConfirmationDialog = () => {
        setState(prev => ({ ...prev, confirmationTargetId: null }));
    };

    /**
     * Opens the confirmation dialog.
     */
    const onOpenConfirmationDialog = (itemId: string) => {
        setState(prev => ({ ...prev, confirmationTargetId: itemId }));
    };

    /**
     * Handles the confirmation action.
     */
    const onConfirmation = async () => {
        try {
            if (!state.confirmationTargetId) {
                return;
            }

            const response = await api.service.resources.mcp.deleteById(state.confirmationTargetId);

            removeConversation(response.data.conversationId);

            toast.add({
                title: localConstants.label.toast.conversationDeleted,
                description: localConstants.label.toast.conversationDeletedDescription,
                type: toastConstants.type.success,
            });
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                title: localConstants.label.toast.conversationDeletionFailed,
                description: localConstants.label.toast.conversationDeletionFailedDescription,
                type: toastConstants.type.error,
            });
        }
    };

    const conversationsRoutes: SidebarRouteItem[] = [
        {
            label: localConstants.label.action.createConversation,
            to: config.routes.conversations.create,
            icon: Plus,
            id: localConstants.id.createConversation,
            includeActions: false,
        },
    ];

    for (const conversation of conversations) {
        conversationsRoutes.push({
            label: conversation.conversationId,
            to: `${config.routes.conversations.base}/${conversation.conversationId}`,
            id: conversation.conversationId,
        });
    }

    // Determine side-bar items
    const sidebarNavItems: SidebarItem[] = [
        {
            label: localConstants.label.domain.home,
            to: config.routes.root,
        },
        {
            label: localConstants.label.domain.jobs,
            to: config.routes.jobs,
        },
        {
            label: localConstants.label.domain.conversations,
            to: config.routes.conversations.create,
            routes: conversationsRoutes,
            isLoading: isFetchingConversations,
        },
    ];

    return (
        <>
            <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
                <Sidebar items={sidebarNavItems} onConfirm={onOpenConfirmationDialog} />

                <SidebarInset>
                    <TopBar />

                    <div className="h-full p-md">
                        <Outlet />
                    </div>
                </SidebarInset>
            </SidebarProvider>

            <ConfirmationDialog
                title={string.replace(localConstants.label.confirmation.title, state.confirmationTargetId!)}
                description={string.replace(localConstants.label.confirmation.description, state.confirmationTargetId!)}
                open={!!state.confirmationTargetId}
                confirmLabel={constants.ui.button.label.delete}
                onOpenChange={onCloseConfirmationDialog}
                onConfirm={onConfirmation}
                confirmVariant="destructive"
            />
        </>
    );
};

export default Dashboard;
