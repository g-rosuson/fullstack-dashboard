import { ReactNode, useCallback, useEffect, useRef } from 'react';

import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import constants from '../constants';
import api from '@/api';
import { StreamSubscription } from '@/api/service/client/types';
import { McpStreamEvents } from '@/api/service/resources/mcp';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';
import { useChatSelection } from '@/store/selectors/chat';
import { useUserSelection } from '@/store/selectors/user';

const McpStream = ({ children }: { children: ReactNode }) => {
    const mountedRef = useRef(false);
    const { accessToken } = useUserSelection();

    const { applySelecting, applyPermission, applyCall, applyAnswer, applyStopped, applyError, applyAnswering } =
        useChatSelection();

    /**
     * Records the selecting step for a prompt this session already knows.
     */
    const onSelecting = useCallback(
        (event: McpStreamEvents['selecting']) => {
            applySelecting(event.promptId);
        },
        [applySelecting]
    );

    /**
     * Shows the ask when the prompt id is already stored. An unknown replay is left unattached.
     */
    const onPermission = useCallback(
        (event: McpStreamEvents['permission']) => {
            applyPermission(event);
        },
        [applyPermission]
    );

    /**
     * Updates the queue for a call. Succeeded and failed after stop are ignored in the slice.
     */
    const onCall = useCallback(
        (event: McpStreamEvents['call']) => {
            applyCall(event);
        },
        [applyCall]
    );

    /**
     * Shows the error context. Earlier turns are left as they were.
     */
    const onError = useCallback(
        (event: McpStreamEvents['error']) => {
            applyError(event.promptId, event.context);
        },
        [applyError]
    );

    /**
     * Shows that the prompt stopped, without an answer.
     */
    const onStopped = useCallback(
        (event: McpStreamEvents['stopped']) => {
            applyStopped(event.promptId);
        },
        [applyStopped]
    );

    /**
     * Shows that the answer is being written.
     */
    const onAnswering = useCallback(
        (event: McpStreamEvents['answering']) => {
            applyAnswering(event.promptId);
        },
        [applyAnswering]
    );

    /**
     * Stores the answer, then reads the conversation so the new turn can be selected.
     */
    const onAnswer = useCallback(
        (event: McpStreamEvents['answer']) => {
            applyAnswer(event);
        },
        [applyAnswer]
    );

    useEffect(() => {
        let cancelled = false;
        mountedRef.current = true;
        let subscription: StreamSubscription | null = null;

        const handleStreamSetup = async () => {
            try {
                if (!accessToken) {
                    return;
                }

                if (cancelled || !mountedRef.current) {
                    return;
                }

                subscription = api.service.resources.mcp.stream({
                    on: {
                        selecting: onSelecting,
                        permission: onPermission,
                        call: onCall,
                        answering: onAnswering,
                        answer: onAnswer,
                        error: onError,
                        stopped: onStopped,
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
    }, [accessToken, onAnswer, onAnswering, onCall, onError, onPermission, onSelecting, onStopped]);

    return children;
};

export default McpStream;
