import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Messages from './messages/Messages';
import Create from './placeholders/create/Create';
import Start from './placeholders/start/Start';
import Skeleton from './skeleton/Skeleton';
import Animate from '@/components/blocks/animate/Animate';
import Composer from '@/components/blocks/composer/Composer';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import constants from './constants';
import { McpConversation } from '@/_types/_gen/mcpConversation';
import api from '@/api';
import config from '@/config';
// import { useChatSelection } from '@/store/selectors/chat';

interface ConversationState {
    prompt: string;
    conversation: McpConversation | null;
    isFetchingConversation: boolean;
    isCreatingConversation: boolean;
}

const intiState: ConversationState = {
    prompt: '',
    conversation: null,
    isFetchingConversation: false,
    isCreatingConversation: false,
};

const Conversation = () => {
    // State
    const [state, setState] = useState<ConversationState>(intiState);
    // Refs
    const composerRef = useRef<HTMLTextAreaElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chatFeedRef = useRef<HTMLDivElement | null>(null);

    // Hooks
    const { conversationId } = useParams();
    const navigate = useNavigate();
    // const chatSelection = useChatSelection();

    /**
     * Handle input change.
     */
    const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setState(prev => ({ ...prev, prompt: event.target.value }));
    };

    /**
     * Handle key down.
     */
    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (!event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onCreateConversation();
        }
    };

    /**
     * Create a new conversation and navigates to a dedicated conversation view.
     */
    const onCreateConversation = async () => {
        try {
            setState(prev => ({ ...prev, isCreatingConversation: true }));
            const response = await api.service.resources.mcp.create();
            navigate(`${config.routes.conversations.base}/${response.data.conversationId}`);
        } catch (error) {
            toast.add({
                title: constants.toast.createConversationErrorTitle,
                description: constants.toast.createConversationErrorDescription,
                type: toastConstants.type.error,
            });
        } finally {
            setState(prev => ({ ...prev, isCreatingConversation: false }));
        }
    };

    /**
     * Fetch the conversation from the API.
     */
    useEffect(() => {
        if (!conversationId) {
            return;
        }

        /**
         * Fetch the conversation from the API.
         */
        const fetchConversation = async () => {
            try {
                setState(prev => ({ ...prev, isFetchingConversation: true }));

                const response = await api.service.resources.mcp.getById(conversationId);

                setState(prev => ({ ...prev, conversation: response.data }));
            } catch (error) {
                console.error(error);
            } finally {
                setState(prev => ({ ...prev, isFetchingConversation: false }));
            }
        };

        fetchConversation();
    }, [conversationId]);

    /**
     * Attach a resize observer to the container and the composer to calculate the top
     * position of the composer based on the container height and the composer height.
     */
    useEffect(() => {
        let container: HTMLDivElement | null = null;
        let composer: HTMLTextAreaElement | null = null;
        let chatFeed: HTMLDivElement | null = null;

        /**
         * Calculate the top position of the composer based on the container height
         * and the composer height. And set the top position of the composer.
         */
        const composerPositionHandler = () => {
            // Assign refs on each invocation to prevent stale closures
            container = containerRef.current;
            composer = composerRef.current;
            chatFeed = chatFeedRef.current;

            if (!container || !composer || !chatFeed) {
                return;
            }

            // Wait for the skeleton to be removed before calculating the top position
            if (conversationId && state.isFetchingConversation) {
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const composerHeight = composer.offsetHeight;

            // Use a probe to calculate the bottom padding for the feed
            const probe = document.createElement('div');
            probe.className = 'm-md';
            document.body.appendChild(probe);
            const spacing = parseFloat(getComputedStyle(probe).marginTop);
            probe.remove();

            // Add probe padding for the feed so items are not cut off by the composer
            const composerHeightWithSpacing = composerHeight + spacing;
            chatFeed.style.paddingBottom = `${composerHeightWithSpacing}px`;

            // How far the bottom of the screen is from the top of the container.
            const distanceToScreenBottom = window.innerHeight - containerRect.top;

            // Sit the composer on the bottom edge of the screen, never above the container.
            const topAtScreenBottom = Math.max(distanceToScreenBottom - composerHeightWithSpacing, 0);

            // Sit the composer on the bottom edge of the container.
            const topAtContainerBottom = container.clientHeight - composerHeight;

            // Stay on screen, but do not hang past the bottom of the container.
            const top = Math.min(topAtScreenBottom, topAtContainerBottom);

            composer.style.top = `${top}px`;
        };

        composerPositionHandler();

        const observer = new ResizeObserver(composerPositionHandler);

        if (container) {
            observer.observe(container);
        }

        if (composer) {
            observer.observe(composer);
        }

        // Note: Do we need to observe the messages? Since new messages will extend the container height.
        if (chatFeed) {
            observer.observe(chatFeed);
        }

        window.addEventListener('scroll', composerPositionHandler);
        window.addEventListener('resize', composerPositionHandler);

        return () => {
            observer.disconnect();

            window.removeEventListener('scroll', composerPositionHandler);
            window.removeEventListener('resize', composerPositionHandler);

            setState(intiState);
        };
    }, [conversationId, state.isFetchingConversation]);

    // Show start, messages or creating conversation view
    let Feed = <Start />;

    if (conversationId) {
        Feed = <Messages turns={state.conversation?.turns ?? []} />;
    }
    if (state.isCreatingConversation) {
        Feed = <Create />;
    }

    // Determine main view
    const View = (
        <section ref={containerRef} className="h-full relative flex flex-col gap-md">
            <div ref={chatFeedRef} className="h-full">
                {Feed}
            </div>

            <Composer
                ref={composerRef}
                className="absolute left-0 right-0"
                value={state.prompt}
                onInputChange={onInputChange}
                onKeyDown={onKeyDown}
                disabled={state.isCreatingConversation}
            />
        </section>
    );

    return <Animate>{state.isFetchingConversation ? <Skeleton /> : View}</Animate>;
};

export default Conversation;
