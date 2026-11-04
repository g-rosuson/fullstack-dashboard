import { useEffect, useState } from 'react';

import Skeleton from './skeleton/Skeleton';
import Turns from './turns/Turns';
import Animate from '@/components/blocks/animate/Animate';
import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import type { Conversation, ConversationTurn } from '@/shared/types/conversation';

import constants from './constants';
import api from '@/api';
import { useConversationSelection } from '@/store/selectors/conversation';

type ConversationState = {
    isFetchingConversation: boolean;
};

const intiState: ConversationState = {
    isFetchingConversation: false,
};

interface ChatProps {
    composerHeight: number;
    initialPrompt?: string;
    conversationId?: string;
}

const Chat = ({ composerHeight, initialPrompt, conversationId }: ChatProps) => {
    // State
    const [state, setState] = useState(intiState);

    // Store
    const { getConversation, setConversationFromRead } = useConversationSelection();

    /**
     * Fetch the conversation from the store or API.
     */
    useEffect(() => {
        let cancelled = false;

        if (initialPrompt || !conversationId) {
            return;
        }

        if (getConversation(conversationId)) {
            return;
        }

        const fetchConversation = async () => {
            try {
                setState(prev => ({ ...prev, isFetchingConversation: true }));

                const response = await api.service.resources.mcp.getById(conversationId);

                if (cancelled || getConversation(conversationId)) {
                    return;
                }

                const turns = response.data.turns.map(turn => ({
                    ...turn,
                    persistedEvents: turn.events,
                    streamEvents: [],
                }));

                setConversationFromRead(response.data.conversationId, turns);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                toast.add({
                    title: constants.toast.conversation.error.title,
                    description: constants.toast.conversation.error.description,
                    type: toastConstants.type.error,
                });
            } finally {
                if (!cancelled) {
                    setState(prev => ({ ...prev, isFetchingConversation: false }));
                }
            }
        };

        fetchConversation();

        return () => {
            cancelled = true;
        };
    }, [conversationId, initialPrompt, getConversation, setConversationFromRead]);

    /**
     * Determine view based on initial prompt and store conversation.
     */
    let view = null;

    /**
     * If there is an initial prompt, create an initial conversation with the initial turn.
     * If any existing conversation is found, add the initial turn to the existing conversation.
     */
    if (initialPrompt) {
        const initialTurn = {
            turnId: 'initial-turn',
            prompt: initialPrompt,
            streamEvents: [],
            persistedEvents: [],
        };
        const storeConversation = conversationId ? getConversation(conversationId) : undefined;
        const promptAlreadyOpen = storeConversation?.turns.some(
            turn => !turn.finishedAt && turn.prompt === initialPrompt
        );
        const turns: ConversationTurn[] = [];

        if (storeConversation) {
            turns.push(...storeConversation.turns);
        }

        if (!promptAlreadyOpen) {
            turns.push(initialTurn);
        }

        const conversation: Conversation = {
            conversationId: conversationId || 'initial-conversation',
            status: storeConversation?.status ?? 'processing',
            turns,
        };

        view = <Turns conversation={conversation} composerHeight={composerHeight} />;
    } else if (conversationId) {
        /**
         * If there is no initial prompt, get the conversation from the
         * store or show loading state if the conversation being fetched.
         */
        const conversation = getConversation(conversationId);

        if (conversation) {
            view = <Turns conversation={conversation} composerHeight={composerHeight} />;
        } else if (state.isFetchingConversation) {
            view = <Skeleton />;
        }
    } else {
        view = (
            <Flex justify="center" align="center" gap="md">
                <Text>{constants.view.conversation.notFound}</Text>
            </Flex>
        );
    }

    return (
        <div className="h-full">
            <Animate>{view}</Animate>
        </div>
    );
};

export default Chat;
