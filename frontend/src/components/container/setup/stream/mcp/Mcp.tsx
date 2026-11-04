import { ReactNode, useEffect, useRef } from 'react';

import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import constants from '../constants';
import api from '@/api';
import { StreamSubscription } from '@/api/service/client/types';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';
import { useConversationSelection } from '@/store/selectors/conversation';

const McpStream = ({ children }: { children: ReactNode }) => {
    const mountedRef = useRef(false);

    const { appendTurnStreamEvent, seedTurnStreamEvents } = useConversationSelection();

    useEffect(() => {
        let cancelled = false;
        let subscription: StreamSubscription | null = null;
        mountedRef.current = true;

        const handleStreamSetup = async () => {
            try {
                if (cancelled || !mountedRef.current) {
                    return;
                }

                subscription = api.service.resources.mcp.stream({
                    on: {
                        'prompt-events': event => {
                            seedTurnStreamEvents(event);
                        },
                        selecting: event => {
                            appendTurnStreamEvent(event);
                        },
                        permission: event => {
                            appendTurnStreamEvent(event);
                        },
                        call: event => {
                            appendTurnStreamEvent(event);
                        },
                        saving: event => {
                            appendTurnStreamEvent(event);
                        },
                        answer: event => {
                            appendTurnStreamEvent(event);
                        },
                        error: event => {
                            appendTurnStreamEvent(event);
                        },
                        stopped: event => {
                            appendTurnStreamEvent(event);
                        },
                    },
                    onError: error => logging.error(error),
                });
            } catch (error) {
                const description = error instanceof CustomError ? error.message : constants.mcp.error.description;

                toast.add({
                    type: toastConstants.type.error,
                    title: constants.mcp.error.title,
                    description,
                });
            }
        };

        void handleStreamSetup();

        return () => {
            cancelled = true;
            mountedRef.current = false;

            subscription?.close();
        };
    }, [appendTurnStreamEvent, seedTurnStreamEvents]);

    return children;
};

export default McpStream;
