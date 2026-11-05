import constants from '../constants';
import utils from '@/utils';

/**
 * Returns the top edge a submitted prompt should meet: the feed top when
 * that top is on screen, otherwise the bottom of the sticky header.
 * @param feed - The chat feed whose top edge is measured.
 */
const measureVisibleChatTop = (feed: HTMLElement | null) => {
    const feedTop = feed?.getBoundingClientRect().top ?? 0;
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;

    return Math.max(feedTop, headerBottom);
};

/**
 * Returns the height from the visible chat top down to the composer.
 * That height is the room kept under a submitted prompt for its answer.
 * @param feed - The chat feed used to find the visible top.
 * @param composer - The composer whose top edge ends the reserved space.
 */
const measureAnswerSpaceHeight = (feed: HTMLElement | null, composer: HTMLElement | null) => {
    const composerTop = composer?.getBoundingClientRect().top ?? 0;

    return Math.max(composerTop - measureVisibleChatTop(feed), 0);
};

/**
 * Scrolls the window so the pinned prompt moves to the visible chat top,
 * leaving an md gap above it. The prompt element is marked with data-pinned-prompt.
 * @param feed - The chat feed that contains the pinned prompt.
 */
const scrollPinnedPromptToTopOfVisibleChat = (feed: HTMLElement | null) => {
    if (!feed) {
        return;
    }

    const pinnedPrompt = feed.querySelector(`[${constants.pinnedPromptAttribute}]`);

    if (!(pinnedPrompt instanceof HTMLElement)) {
        return;
    }

    const spaceAbovePrompt = utils.spacing.measure('md');
    const distanceFromVisibleTop =
        pinnedPrompt.getBoundingClientRect().top - measureVisibleChatTop(feed) - spaceAbovePrompt;

    if (Math.abs(distanceFromVisibleTop) < 1) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollBy({
        top: distanceFromVisibleTop,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
};

/**
 * Places the window so the bottom of the feed meets the bottom of the viewport
 * before the turns paint. The feed's bottom padding keeps the newest turn above the composer.
 * A feed shorter than the viewport stays at the top, which already shows that turn.
 * @param feed - The chat feed whose bottom edge is placed.
 */
const placeOpenedConversationAtBottom = (feed: HTMLElement | null) => {
    if (!feed) {
        return;
    }

    const feedBottom = feed.getBoundingClientRect().bottom + window.scrollY;
    const top = Math.max(feedBottom - window.innerHeight, 0);

    window.scrollTo({
        top,
        behavior: 'auto',
    });
};

/**
 * Returns the reserved answer height when the composer or the viewport has moved.
 * An unchanged measurement returns undefined so the caller does not render again.
 * @param feed - The chat feed used to find the visible top.
 * @param composer - The composer whose top edge ends the reserved space.
 * @param pinnedTurnId - The turn that keeps the reserved space, when one is pinned.
 * @param reservedHeight - The height already reserved.
 */
const readNextAnswerSpaceHeight = (
    feed: HTMLElement | null,
    composer: HTMLElement | null,
    pinnedTurnId: string | undefined,
    reservedHeight: number
) => {
    if (!pinnedTurnId) {
        return undefined;
    }

    const nextHeight = measureAnswerSpaceHeight(feed, composer);

    if (nextHeight === reservedHeight) {
        return undefined;
    }

    return nextHeight;
};

const geometry = {
    measureAnswerSpaceHeight,
    scrollPinnedPromptToTopOfVisibleChat,
    placeOpenedConversationAtBottom,
    readNextAnswerSpaceHeight,
};

export default geometry;
