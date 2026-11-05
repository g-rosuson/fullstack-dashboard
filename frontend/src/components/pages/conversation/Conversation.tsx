import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Chat from './components/chat/Chat';
import Create from './components/create/Create';
import Composer from '@/components/blocks/composer/Composer';
import Flex from '@/components/blocks/flex/Flex';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import type { ChangeEvent, KeyboardEvent } from 'react';

import constants from './constants';
import geometry from './geometry';
import api from '@/api';
import { buildConversationUrl } from '@/config';
import { useConversationSelection } from '@/store/selectors/conversation';
import utils from '@/utils';

// The happy path can finish. Send, the stream, Allow, and Deny already reach an answer. Three client gaps still stop a prompt from reaching a finished state.

// Stop is not wired. mcp.stop is never called. A stopped event also sets the conversation to idle, which unmounts Status, so the stopped line never appears and the turn stays open.
// A failure does not finish the turn. Status shows "An error occurred" and ignores context. finishedAt is not set, so that turn stays the open one.
// The composer stays enabled while a prompt is open. It is disabled only while the conversation is loading. A second Enter calls startPrompt, fails, and marks the whole conversation error while the first prompt is still running.

interface ConversationState {
    prompt: string;
    initialPrompt: string | undefined;
    composerHeight: number;
    pinnedTurnId: string | undefined;
    answerMinHeight: number;
}

const intiState: ConversationState = {
    prompt: '',
    initialPrompt: undefined,
    composerHeight: 0,
    pinnedTurnId: undefined,
    answerMinHeight: 0,
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
    const pinnedTurnIdRef = useRef<string | undefined>(undefined);
    const pinnedConversationIdRef = useRef<string | undefined>(undefined);
    const answerSpaceHeightRef = useRef(0);
    const placedConversationIdRef = useRef<string | undefined>(undefined);

    // Hooks
    const params = useParams();
    const navigate = useNavigate();

    // Derived state
    const isFetchingConversation = Boolean(params.conversationId && !getConversation(params.conversationId));
    const openedTurnCount = params.conversationId
        ? (getConversation(params.conversationId)?.turns.length ?? 0)
        : 0;

    // Scroll and resize handlers read these refs, so they stay aligned with the latest render.
    pinnedTurnIdRef.current = state.pinnedTurnId;
    answerSpaceHeightRef.current = state.answerMinHeight;

    /**
     * Remembers this prompt as pinned and reserves answer space from the current
     * chat geometry, before the prompt is painted.
     */
    const pinSubmittedPrompt = () => {
        const answerMinHeight = geometry.measureAnswerSpaceHeight(chatFeedRef.current, composerRef.current);

        pinnedConversationIdRef.current = params.conversationId;
        pinnedTurnIdRef.current = constants.initialTurnId;
        answerSpaceHeightRef.current = answerMinHeight;

        setState(prev => ({
            ...prev,
            initialPrompt: prev.prompt,
            pinnedTurnId: constants.initialTurnId,
            answerMinHeight,
        }));
    };

    /**
     * Drops the pin when the submitted prompt is not kept on screen.
     */
    const releasePinnedPrompt = () => {
        pinnedConversationIdRef.current = undefined;
        pinnedTurnIdRef.current = undefined;
        answerSpaceHeightRef.current = 0;

        setState(prev => ({
            ...prev,
            initialPrompt: undefined,
            pinnedTurnId: undefined,
            answerMinHeight: 0,
        }));
    };

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

        const sentPrompt = state.prompt;

        pinSubmittedPrompt();

        let tmpConversationId = params.conversationId;
        let startResponse;

        try {
            if (!tmpConversationId) {
                const createdConversation = await api.service.resources.mcp.create();
                tmpConversationId = createdConversation.data.conversationId;

                /**
                 * Show the new conversation in the list and open it before the prompt response.
                 * It is processing while that prompt is being sent.
                 */
                setConversation({
                    conversationId: tmpConversationId,
                    status: 'processing',
                    turns: [],
                });
                setSummary(createdConversation.data);
                pinnedConversationIdRef.current = tmpConversationId;
                navigate(buildConversationUrl(tmpConversationId));
            }

            startResponse = await api.service.resources.mcp.startPrompt({
                conversationId: tmpConversationId,
                prompt: sentPrompt,
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
                releasePinnedPrompt();
            } else {
                const existing = getConversation(tmpConversationId);

                if (existing && existing.turns.length > 0) {
                    /**
                     * Conversation exists in store but failed to start, therefore we set the status to failed.
                     * The new prompt is not kept, so the previous turns stay at their own height.
                     */
                    setConversationStatus(tmpConversationId, 'error');
                    releasePinnedPrompt();
                } else if (existing) {
                    /**
                     * The prompt did not start. Keep it and mark the conversation failed.
                     */
                    setConversation({
                        conversationId: tmpConversationId,
                        status: 'error',
                        turns: [
                            {
                                turnId: constants.initialTurnId,
                                prompt: sentPrompt,
                                streamEvents: [],
                                persistedEvents: [],
                            },
                        ],
                    });
                    setConversationStatus(tmpConversationId, 'error');
                    setState(prev => ({ ...prev, initialPrompt: undefined }));
                } else {
                    releasePinnedPrompt();
                }
            }

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
        }

        const startedTurnId = startResponse.data.turn.turnId;

        pinnedTurnIdRef.current = startedTurnId;

        setState(prev => ({
            ...prev,
            prompt: '',
            initialPrompt: undefined,
            pinnedTurnId: startedTurnId,
        }));
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
     * This runs before paint so an opened conversation can measure that padded bottom.
     */
    useLayoutEffect(() => {
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

            const nextAnswerSpaceHeight = geometry.readNextAnswerSpaceHeight(
                chatFeed,
                composer,
                pinnedTurnIdRef.current,
                answerSpaceHeightRef.current
            );

            if (nextAnswerSpaceHeight !== undefined) {
                answerSpaceHeightRef.current = nextAnswerSpaceHeight;
                setState(prev => ({ ...prev, answerMinHeight: nextAnswerSpaceHeight }));
            }
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

    /**
     * Scrolls the submitted prompt to the visible chat top after it has painted,
     * so the move is visible. Later composer or viewport changes only adjust the reserved height.
     */
    useEffect(() => {
        if (!state.pinnedTurnId) {
            return;
        }

        geometry.scrollPinnedPromptToTopOfVisibleChat(chatFeedRef.current);
    }, [state.pinnedTurnId]);

    /**
     * Drops the pin when the route opens a conversation other than the one just
     * submitted, so saved turns keep their own height.
     */
    useLayoutEffect(() => {
        if (!pinnedTurnIdRef.current) {
            return;
        }

        if (pinnedConversationIdRef.current === params.conversationId) {
            return;
        }

        pinnedConversationIdRef.current = undefined;
        pinnedTurnIdRef.current = undefined;
        answerSpaceHeightRef.current = 0;

        setState(prev => ({
            ...prev,
            pinnedTurnId: undefined,
            answerMinHeight: 0,
        }));
    }, [params.conversationId]);

    /**
     * Places an opened conversation at the bottom once its turns are committed,
     * before they paint. A later turn in the same visit does not move the view.
     * A pinned prompt keeps the scroll that brings that prompt to the top.
     */
    useLayoutEffect(() => {
        if (placedConversationIdRef.current !== params.conversationId) {
            placedConversationIdRef.current = undefined;
        }

        if (!params.conversationId || pinnedTurnIdRef.current) {
            return;
        }

        if (placedConversationIdRef.current === params.conversationId) {
            return;
        }

        if (!openedTurnCount) {
            return;
        }

        geometry.placeOpenedConversationAtBottom(chatFeedRef.current);
        placedConversationIdRef.current = params.conversationId;
    }, [params.conversationId, openedTurnCount]);

    // Determine the feed
    let Feed = null;

    if (state.initialPrompt) {
        Feed = (
            <Chat
                composerHeight={state.composerHeight}
                answerMinHeight={state.answerMinHeight}
                conversationId={params.conversationId}
                initialPrompt={state.initialPrompt}
                pinnedTurnId={state.pinnedTurnId}
            />
        );
    } else if (params.conversationId) {
        Feed = (
            <Chat
                composerHeight={state.composerHeight}
                answerMinHeight={state.answerMinHeight}
                conversationId={params.conversationId}
                pinnedTurnId={state.pinnedTurnId}
            />
        );
    } else {
        Feed = <Create />;
    }

    // Determine main view
    const View = (
        <div ref={containerRef} className="min-h-full relative max-w-xl mx-auto">
            <Flex direction="column" gap="md" className="min-h-full">
                <section ref={chatFeedRef} className="min-h-full w-full">
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
