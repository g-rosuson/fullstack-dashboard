import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Chat from './components/chat/Chat';
import Create from './components/create/Create';
import Composer from '@/components/blocks/composer/Composer';
import Flex from '@/components/blocks/flex/Flex';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import type { ChangeEvent, KeyboardEvent } from 'react';

import constants from './constants';
import api from '@/api';
import { buildConversationUrl } from '@/config';
import { useConversationSelection } from '@/store/selectors/conversation';
import utils from '@/utils';

// TODO: Tests
interface ConversationState {
    prompt: string;
    initialPrompt: string | undefined;
    composerHeight: number;
}

const intiState: ConversationState = {
    prompt: '',
    initialPrompt: undefined,
    composerHeight: 0,
};

const Conversation = () => {
    // State
    const [state, setState] = useState<ConversationState>(intiState);

    // Store
    const {
        getConversation,
        setConversation,
        setConversationStatus,
        addConversationTurn,
        updateConversationTurn,
        setSummary,
    } = useConversationSelection();

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const chatFeedRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLDivElement>(null);
    const isSendingPromptRef = useRef(false);

    // Hooks
    const params = useParams();
    const navigate = useNavigate();

    // Derived state
    const isFetchingConversation = Boolean(params.conversationId && !getConversation(params.conversationId));

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
        if (!state.prompt.trim() || event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        // Shift+Enter inserts a newline at the caret. Enter sends the prompt.
        if (event.shiftKey) {
            const textarea = event.currentTarget;
            const { selectionStart, selectionEnd, value } = textarea;
            const nextPrompt = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;

            setState(prev => ({ ...prev, prompt: nextPrompt }));

            const caret = selectionStart + 1;

            // Updating the text moves the cursor to the end. Put it back after the new line
            // once that update has finished, including when the line was inserted mid-text.
            requestAnimationFrame(() => {
                textarea.selectionStart = caret;
                textarea.selectionEnd = caret;
            });

            return;
        }

        onPromptSend();
    };

    /**
     * Send a prompt to the server.
     */
    const onPromptSend = async () => {
        if (isSendingPromptRef.current) {
            return;
        }

        /**
         * When navigating manually to a conversation page, the <Chat/> component can be still
         * fetching when a prompt is sent. Therefore we block the send until the conversation
         * is fetched and stored in the store.
         *
         * Note: Composer should be also disabled.
         */
        if (isFetchingConversation) {
            return;
        }

        isSendingPromptRef.current = true;

        setState(prev => ({ ...prev, initialPrompt: state.prompt }));

        let tmpConversationId = params.conversationId;
        let startResponse;
        let createdConversation;

        try {
            if (!tmpConversationId) {
                createdConversation = await api.service.resources.mcp.create();
                tmpConversationId = createdConversation.data.conversationId;
            }

            startResponse = await api.service.resources.mcp.startPrompt({
                conversationId: tmpConversationId,
                prompt: state.prompt,
            });
        } catch (error) {
            // TODO: Add sentry logging
            toast.add({
                title: constants.toast.promptErrorTitle,
                description: constants.toast.promptErrorDescription,
                type: toastConstants.type.error,
            });

            /**
             * Creation failed if there's no conversation id.
             */
            if (!tmpConversationId) {
                console.error(constants.error.createConversation);
                // TODO: Add sentry logging
            } else if (getConversation(tmpConversationId)) {
                /**
                 * Conversation exists in store but failed to start, therefore we set the status to failed.
                 */
                setConversationStatus(tmpConversationId, 'error');
            } else if (createdConversation) {
                /**
                 * Conversation was created, but does not exist in the store.
                 * It failed to start, so keep the prompt that was sent and mark it failed.
                 */
                setConversation({
                    conversationId: tmpConversationId,
                    status: 'error',
                    turns: [
                        {
                            turnId: 'initial-turn',
                            prompt: state.prompt,
                            streamEvents: [],
                            persistedEvents: [],
                        },
                    ],
                });

                /**
                 * Since the conversation was created, we should set the summary so the
                 * sidebar shows the conversation link and navigate to the page.
                 */
                setSummary(createdConversation.data);

                navigate(buildConversationUrl(tmpConversationId));
            }

            setState(prev => ({ ...prev, initialPrompt: undefined }));

            /**
             * Skip success path after "finally" when there's an error.
             */
            return;
        } finally {
            isSendingPromptRef.current = false;
        }

        /**
         * The stream may have appended steps for this turn before the start response arrived.
         * Keep those events. An open turn has no saved steps.
         */
        const storeConversation = getConversation(tmpConversationId);
        const storeConversationTurn = storeConversation?.turns.find(
            turn => turn.turnId === startResponse.data.turn.turnId
        );
        const openTurn = {
            ...startResponse.data.turn,
            streamEvents: storeConversationTurn?.streamEvents ?? [],
            persistedEvents: [],
        };

        if (storeConversationTurn) {
            updateConversationTurn(tmpConversationId, openTurn);
        } else if (storeConversation) {
            addConversationTurn(tmpConversationId, openTurn);
        } else if (createdConversation) {
            setConversation({
                conversationId: tmpConversationId,
                status: 'processing',
                turns: [openTurn],
            });

            setSummary(createdConversation.data);

            navigate(buildConversationUrl(tmpConversationId));
        }

        setState(prev => ({ ...prev, prompt: '', initialPrompt: undefined }));
    };

    /**
     * The prompt update has not resized the composer yet.
     * Measure its height once the new text is on screen.
     */
    useEffect(() => {
        setState(prev => ({ ...prev, composerHeight: composerRef.current?.offsetHeight ?? 0 }));
    }, [state.prompt]);

    /**
     * Pin the event and composer to the bottom of the screen, inside this container.
     * The feed is padded by their combined height so messages stay visible above them.
     */
    useEffect(() => {
        let container: HTMLDivElement | null = null;
        let composer: HTMLDivElement | null = null;
        let chatFeed: HTMLDivElement | null = null;

        /**
         * Place the event-and-composer stack on the bottom edge of the screen,
         * and keep it inside the container when the container ends higher up.
         */
        const eventComposerPositionHandler = () => {
            // Assign refs on each invocation to prevent stale closures
            container = containerRef.current;
            composer = composerRef.current;
            chatFeed = chatFeedRef.current;

            if (!container || !composer || !chatFeed) {
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const composerHeight = composer.offsetHeight;
            const spacing = utils.spacing.measure('md');

            // Add probe padding for the feed so items are not cut off by the stack
            const composerHeightWithSpacing = composerHeight + spacing;
            chatFeed.style.paddingBottom = `${composerHeightWithSpacing}px`;

            // How far the bottom of the screen is from the top of the container.
            const distanceToScreenBottom = window.innerHeight - containerRect.top;

            // Sit the stack on the bottom edge of the screen, never above the container.
            const topAtScreenBottom = Math.max(distanceToScreenBottom - composerHeightWithSpacing, 0);

            // Sit the stack on the bottom edge of the container.
            const topAtContainerBottom = container.clientHeight - composerHeight;

            // Stay on screen, but do not hang past the bottom of the container.
            const top = Math.min(topAtScreenBottom, topAtContainerBottom);

            composer.style.top = `${top}px`;
        };

        eventComposerPositionHandler();

        const observer = new ResizeObserver(eventComposerPositionHandler);

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

        window.addEventListener('scroll', eventComposerPositionHandler);
        window.addEventListener('resize', eventComposerPositionHandler);

        return () => {
            observer.disconnect();

            window.removeEventListener('scroll', eventComposerPositionHandler);
            window.removeEventListener('resize', eventComposerPositionHandler);
        };
    }, []);

    // Determine the feed
    let Feed = null;

    if (state.initialPrompt) {
        Feed = (
            <Chat
                composerHeight={state.composerHeight}
                conversationId={params.conversationId}
                initialPrompt={state.initialPrompt}
            />
        );
    } else if (params.conversationId) {
        Feed = <Chat composerHeight={state.composerHeight} conversationId={params.conversationId} />;
    } else {
        Feed = <Create />;
    }

    // Determine main view
    const View = (
        <div ref={containerRef} className="h-full relative max-w-xl mx-auto">
            <Flex direction="column" gap="md" className="h-full">
                <section ref={chatFeedRef} className="h-full w-full">
                    {Feed}
                </section>

                <section ref={composerRef} className="absolute left-0 right-0">
                    <Composer
                        className="w-full"
                        value={state.prompt}
                        onInputChange={onInputChange}
                        onKeyDown={onKeyDown}
                        disabled={isFetchingConversation}
                    />
                </section>
            </Flex>
        </div>
    );

    return View;
};

export default Conversation;
