import { ReactNode, useEffect, useRef } from 'react';

import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import constants from './constants';
import api from '@/api';
import { CustomError } from '@/services/error';
import { useConversationSelection } from '@/store/selectors/conversation';
import { useUserSelection } from '@/store/selectors/user';

const Conversation = ({ children }: { children: ReactNode }) => {
    const mountedRef = useRef(false);
    const { accessToken } = useUserSelection();

    const { setSummaries, setIsFetchingSummaries } = useConversationSelection();

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

                setIsFetchingSummaries(true);

                const response = await api.service.resources.mcp.list();

                if (cancelled || !mountedRef.current) {
                    return;
                }

                setSummaries(response.data);
            } catch (error) {
                if (cancelled || !mountedRef.current) {
                    return;
                }

                const description = error instanceof CustomError ? error.message : constants.error.description;

                toast.add({
                    type: toastConstants.type.error,
                    title: constants.error.title,
                    description,
                });
            } finally {
                if (!cancelled && mountedRef.current) {
                    setIsFetchingSummaries(false);
                }
            }
        };

        void onFetchConversations();

        return () => {
            cancelled = true;
            mountedRef.current = false;
        };
    }, [accessToken, setSummaries, setIsFetchingSummaries]);

    return children;
};

export default Conversation;
