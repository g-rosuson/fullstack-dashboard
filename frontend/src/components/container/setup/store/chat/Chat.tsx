import { ReactNode, useEffect, useRef } from 'react';

import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import constants from './constants';
import api from '@/api';
import { CustomError } from '@/services/error';
import { useChatSelection } from '@/store/selectors/chat';
import { useUserSelection } from '@/store/selectors/user';

const Chat = ({ children }: { children: ReactNode }) => {
    const mountedRef = useRef(false);
    const { accessToken } = useUserSelection();

    const { setConversations, setFetchingConversations } = useChatSelection();

    useEffect(() => {
        let cancelled = false;
        mountedRef.current = true;

        /**
         * Fetch conversations and set the conversations in the store so
         * they can be used to generate sidebar route items.
         */
        const onFetchConversations = async () => {
            try {
                if (!accessToken) {
                    return;
                }

                if (cancelled || !mountedRef.current) {
                    return;
                }

                setFetchingConversations(true);
                const response = await api.service.resources.mcp.list();
                setConversations(response.data);
            } catch (error) {
                const description = error instanceof CustomError ? error.message : constants.error.description;

                toast.add({
                    type: toastConstants.type.error,
                    title: constants.error.title,
                    description,
                });
            } finally {
                setFetchingConversations(false);
            }
        };

        void onFetchConversations();

        return () => {
            cancelled = true;
            mountedRef.current = false;
        };
    }, [accessToken, setConversations, setFetchingConversations]);

    return children;
};

export default Chat;
