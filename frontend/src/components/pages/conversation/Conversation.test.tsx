import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, type Mock } from 'vitest';

import Dashboard from '@/components/layout/dashboard/Dashboard';

import chatConstants from './components/chat/constants';
import conversationConstants from './constants';
import Conversation from './Conversation';
import api from '@/api';
import config from '@/config';
import { useStore } from '@/store';
import utils from '@/utils';

const conversationId = 'conv-1';
const prompt = 'Hello from an empty chat';

const toastAdd = vi.hoisted(() => vi.fn());

vi.mock('@/api', () => ({
    default: {
        service: {
            resources: {
                authentication: {
                    logout: vi.fn(),
                },
                mcp: {
                    create: vi.fn(),
                    startPrompt: vi.fn(),
                    stop: vi.fn(),
                    getById: vi.fn(),
                    deleteById: vi.fn(),
                    list: vi.fn(),
                },
            },
        },
    },
}));

vi.mock('@/components/blocks/toast/Toast', async importOriginal => {
    const actual = await importOriginal<typeof import('@/components/blocks/toast/Toast')>();

    return {
        ...actual,
        toast: {
            ...actual.toast,
            add: toastAdd,
        },
    };
});

vi.mock('@/services/logging', () => ({
    default: {
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

/**
 * A promise the test settles when the prompt response should arrive.
 */
const deferred = <T,>() => {
    // The parameter name is only the type of the resolver.
    // eslint-disable-next-line no-unused-vars
    let resolve: (value: T) => void = () => undefined;
    const promise = new Promise<T>(res => {
        resolve = res;
    });

    return { promise, resolve };
};

const visibleChatTop = 80;
const composerTop = 800;
const pinnedPromptTop = 720;
const attachedTurnTop = 400;
const reservedAnswerHeight = composerTop - visibleChatTop;

/**
 * A DOM rect with the top and height the chat geometry test needs.
 */
const box = (top: number, height: number): DOMRect =>
    ({
        x: 0,
        y: top,
        top,
        left: 0,
        right: 400,
        bottom: top + height,
        width: 400,
        height,
        toJSON: () => ({}),
    }) as DOMRect;

/**
 * Fixes the header, feed, composer, and pinned prompt so the reserved height and scroll can be asserted.
 */
/**
 * Returns the box for the element whose size is being measured.
 * @param element - The header, feed, composer, or pinned prompt.
 */
const rectFor = (element: HTMLElement) => {
    if (element.tagName === 'HEADER') {
        return box(0, 64);
    }

    if (element.hasAttribute('data-pinned-prompt')) {
        return box(pinnedPromptTop, 48);
    }

    if (element.hasAttribute('data-turn-id')) {
        return box(attachedTurnTop, 120);
    }

    if (element.tagName === 'SECTION' && element.querySelector('textarea')) {
        return box(composerTop, 80);
    }

    if (element.tagName === 'SECTION') {
        return box(visibleChatTop, 720);
    }

    return box(0, 0);
};

/**
 * Fixes the header, feed, composer, and pinned prompt so the reserved height and scroll can be asserted.
 */
const mockChatGeometry = () => {
    return (
        vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            // The this parameter types the element being measured. ESLint does not count that use.
            // eslint-disable-next-line no-unused-vars
            .mockImplementation(function mockRect(this: HTMLElement) {
                return rectFor(this);
            })
    );
};

/**
 * The menu control that shows a conversation label.
 */
const destinationByLabel = (label: string): HTMLElement => {
    const destination = screen.getByText(label).closest('[data-sidebar="menu-button"]');

    if (!(destination instanceof HTMLElement)) {
        throw new Error(`No menu control found for ${label}`);
    }

    return destination;
};

/**
 * Renders the conversation page inside the sidebar shell.
 * `location` follows the router after search updates.
 */
const renderConversation = (path: string) => {
    const location = { current: { pathname: '', search: '' } };

    const LocationProbe = () => {
        const current = useLocation();
        location.current = { pathname: current.pathname, search: current.search };

        return null;
    };

    const view = render(
        <MemoryRouter initialEntries={[path]}>
            <LocationProbe />
            <Routes>
                <Route element={<Dashboard />}>
                    <Route path={config.routes.conversations.create} element={<Conversation />} />
                    <Route path={config.routes.conversations.conversation} element={<Conversation />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

    return { ...view, location };
};

/**
 * The saved turn on screen.
 */
const turnById = (turnId: string) => {
    const turn = document.querySelector(`[data-turn-id="${turnId}"]`);

    if (!(turn instanceof HTMLElement)) {
        throw new Error(`No turn found for ${turnId}`);
    }

    return turn;
};

/**
 * The attach control for one turn.
 */
const attachButton = (turnId: string) => {
    return within(turnById(turnId)).getByRole('button', { name: chatConstants.turn.button.ariaLabel });
};

const firstPrompt = 'First prompt';
const secondPrompt = 'Second prompt';

/**
 * The prompt field, including turns added to the next prompt.
 */
const composerGroup = () => {
    const field = screen.getByRole('textbox', { name: conversationConstants.composer.label });
    const group = field.closest('[data-slot="input-group"]');

    if (!(group instanceof HTMLElement)) {
        throw new Error('No composer');
    }

    return group;
};

/**
 * The control that takes one added turn off the next prompt.
 */
const removeAttachedTurn = (promptText: string) => {
    const chip = within(composerGroup()).getByText(promptText).closest('div');

    if (!(chip instanceof HTMLElement)) {
        throw new Error(`No attached turn for ${promptText}`);
    }

    return within(chip).getByRole('button', { name: conversationConstants.composer.removeTurn });
};

/**
 * Puts two finished turns in the store for this conversation.
 */
const seedFinishedTurns = () => {
    useStore.getState().setConversation({
        conversationId,
        status: 'idle',
        turns: [
            {
                turnId: 'turn-1',
                prompt: firstPrompt,
                answer: 'First answer',
                finishedAt: '2026-11-04T00:00:01.000Z',
                streamEvents: [],
                persistedEvents: [],
            },
            {
                turnId: 'turn-2',
                prompt: secondPrompt,
                answer: 'Second answer',
                finishedAt: '2026-11-04T00:00:02.000Z',
                streamEvents: [],
                persistedEvents: [],
            },
        ],
    });
};

describe('Conversation page', () => {
    beforeEach(() => {
        useStore.getState().clearConversation();
        useStore.getState().setIsFetchingSummaries(false);
        useStore.setState({ email: 'user@example.com' });
    });

    afterEach(() => {
        useStore.getState().clearConversation();
        vi.clearAllMocks();
    });

    it('[CLIENT-MCP-CNV-008] / [FR-MCP-CNV-007] creates, lists, and opens a conversation and shows the prompt before the response', async () => {
        const start = deferred<{
            data: { promptId: string; turn: { turnId: string; prompt: string; startedAt: string } };
        }>();

        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockReturnValue(start.promise);

        renderConversation(config.routes.conversations.create);

        const composer = screen.getByPlaceholderText('Enter prompt...');

        await userEvent.type(composer, prompt);
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(destinationByLabel(conversationId)).toHaveAttribute('data-active', 'true');
        });

        expect(screen.getByText(prompt, { selector: 'p' })).toBeInTheDocument();
        expect(composer).toHaveValue(prompt);
        expect(api.service.resources.mcp.create).toHaveBeenCalledTimes(1);
        expect(api.service.resources.mcp.startPrompt).toHaveBeenCalledTimes(1);
        expect(destinationByLabel(conversationId)).toHaveClass('border-primary');

        start.resolve({
            data: {
                promptId: 'prompt-1',
                turn: {
                    turnId: 'turn-1',
                    prompt,
                    startedAt: '2026-11-04T00:00:00.000Z',
                },
            },
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter prompt...')).toHaveValue('');
        });
    });

    it('[CLIENT-MCP-CNV-009] / [FR-MCP-CST-005] keeps a conversation whose prompt does not start and shows the error border', async () => {
        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockRejectedValue(new Error('did not start'));

        renderConversation(config.routes.conversations.create);

        await userEvent.type(screen.getByPlaceholderText('Enter prompt...'), prompt);
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(destinationByLabel(conversationId)).toHaveClass('border-destructive');
            expect(destinationByLabel(conversationId)).toHaveAttribute('data-active', 'true');
            expect(screen.getByText(prompt, { selector: 'p' })).toBeInTheDocument();
            expect(screen.getByText('An error occurred')).toBeInTheDocument();
        });

        expect(destinationByLabel(conversationId)).toHaveTextContent(conversationId);

        await userEvent.click(screen.getByPlaceholderText('Enter prompt...'));
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(api.service.resources.mcp.startPrompt).toHaveBeenCalledTimes(2);
        });
    });

    it('[CLIENT-MCP-CNV-010] / [FR-MCP-CNV-008] does not send a second prompt while the first request is in flight', async () => {
        const start = deferred<{
            data: { promptId: string; turn: { turnId: string; prompt: string; startedAt: string } };
        }>();

        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockReturnValue(start.promise);

        renderConversation(config.routes.conversations.create);

        const composer = screen.getByPlaceholderText('Enter prompt...');

        await userEvent.type(composer, prompt);
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(api.service.resources.mcp.startPrompt).toHaveBeenCalledTimes(1);
        });

        await userEvent.keyboard('{Enter}');

        expect(api.service.resources.mcp.startPrompt).toHaveBeenCalledTimes(1);
        expect(api.service.resources.mcp.create).toHaveBeenCalledTimes(1);

        start.resolve({
            data: {
                promptId: 'prompt-1',
                turn: {
                    turnId: 'turn-1',
                    prompt,
                    startedAt: '2026-11-04T00:00:00.000Z',
                },
            },
        });
    });

    it('[CLIENT-MCP-CNV-010] / [FR-MCP-CNV-008] does not send while the conversation is loading', () => {
        (api.service.resources.mcp.getById as Mock).mockReturnValue(new Promise(() => undefined));

        renderConversation(`/conversations/${conversationId}`);

        expect(screen.getByPlaceholderText('Enter prompt...')).toBeDisabled();
        expect(api.service.resources.mcp.startPrompt).not.toHaveBeenCalled();
        expect(api.service.resources.mcp.create).not.toHaveBeenCalled();
    });

    it('[CLIENT-MCP-CNV-002] / [FR-MCP-CNV-004] does not send another prompt while one is open', async () => {
        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'processing',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: 'Hello',
                    promptId: 'prompt-1',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });

        renderConversation(`/conversations/${conversationId}`);

        await userEvent.type(screen.getByPlaceholderText('Enter prompt...'), 'Next');
        await userEvent.keyboard('{Enter}');

        expect(api.service.resources.mcp.startPrompt).not.toHaveBeenCalled();
        expect(useStore.getState().getConversation(conversationId)?.status).toBe('processing');
    });

    it('[CLIENT-MCP-CNV-002] / [FR-MCP-CNV-004] does not send while an open turn has no prompt id', async () => {
        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'processing',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: 'Hello',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });

        renderConversation(`/conversations/${conversationId}`);

        expect(screen.getByRole('button', { name: 'Send prompt' })).toBeDisabled();

        await userEvent.type(screen.getByPlaceholderText('Enter prompt...'), 'Next');
        await userEvent.keyboard('{Enter}');

        expect(api.service.resources.mcp.startPrompt).not.toHaveBeenCalled();
        expect(useStore.getState().getConversation(conversationId)?.status).toBe('processing');
    });

    it('[CLIENT-MCP-CNV-002] / [HTTP-MCP-PRG-008] keeps the open prompt running when a start is rejected', async () => {
        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'idle',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: 'Hello',
                    answer: 'Answer',
                    finishedAt: '2026-11-04T00:00:01.000Z',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });
        (api.service.resources.mcp.startPrompt as Mock).mockImplementation(async () => {
            useStore.getState().setConversation({
                conversationId,
                status: 'processing',
                turns: [
                    {
                        turnId: 'turn-1',
                        prompt: 'Hello',
                        answer: 'Answer',
                        finishedAt: '2026-11-04T00:00:01.000Z',
                        streamEvents: [],
                        persistedEvents: [],
                    },
                    {
                        turnId: 'turn-2',
                        prompt: 'Running',
                        promptId: 'prompt-2',
                        streamEvents: [],
                        persistedEvents: [],
                    },
                ],
            });

            throw new Error('busy');
        });

        renderConversation(`/conversations/${conversationId}`);

        await userEvent.type(screen.getByPlaceholderText('Enter prompt...'), 'Next');
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(toastAdd).toHaveBeenCalled();
        });

        expect(api.service.resources.mcp.startPrompt).toHaveBeenCalledTimes(1);
        expect(useStore.getState().getConversation(conversationId)?.status).toBe('processing');
        expect(useStore.getState().getConversation(conversationId)?.turns[1]?.promptId).toBe('prompt-2');
    });

    it('[CLIENT-MCP-STP-001] / [FR-MCP-STP-001] stops the open prompt', async () => {
        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'processing',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: 'Hello',
                    promptId: 'prompt-1',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });
        (api.service.resources.mcp.stop as Mock).mockResolvedValue({ data: { promptId: 'prompt-1' } });

        renderConversation(`/conversations/${conversationId}`);

        await userEvent.click(screen.getByRole('button', { name: 'Stop prompt' }));

        expect(api.service.resources.mcp.stop).toHaveBeenCalledWith('prompt-1');
        expect(api.service.resources.mcp.startPrompt).not.toHaveBeenCalled();
        expect(useStore.getState().getConversation(conversationId)?.status).toBe('processing');
    });

    it('[CLIENT-MCP-CNV-006] / [FR-MCP-CNV-003] leaves the create page when the open conversation is deleted', async () => {
        const otherConversationId = 'conv-2';
        const savedPrompt = 'Saved prompt';

        useStore.getState().setSummaries([{ conversationId }, { conversationId: otherConversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'idle',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: savedPrompt,
                    answer: 'Saved answer',
                    finishedAt: '2026-11-04T00:00:01.000Z',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });
        useStore.getState().setConversation({
            conversationId: otherConversationId,
            status: 'idle',
            turns: [
                {
                    turnId: 'turn-2',
                    prompt: 'Other prompt',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });
        (api.service.resources.mcp.deleteById as Mock).mockResolvedValue({ data: { conversationId } });

        renderConversation(`/conversations/${conversationId}`);

        expect(screen.getByText(savedPrompt, { selector: 'p' })).toBeInTheDocument();

        const openConversation = within(destinationByLabel(conversationId));

        await userEvent.click(openConversation.getByRole('button', { name: 'Dropdown menu trigger' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
        });

        expect(screen.queryByText(savedPrompt, { selector: 'p' })).not.toBeInTheDocument();
        expect(screen.queryByText(conversationId)).not.toBeInTheDocument();
        expect(destinationByLabel(otherConversationId)).toBeInTheDocument();
        expect(useStore.getState().getConversation(conversationId)).toBeUndefined();
        expect(useStore.getState().getConversation(otherConversationId)?.turns[0]?.prompt).toBe('Other prompt');
    });

    it('pins a submitted prompt to the top of the visible chat and keeps that space after the turn id arrives', async () => {
        const start = deferred<{
            data: { promptId: string; turn: { turnId: string; prompt: string; startedAt: string } };
        }>();
        const geometry = mockChatGeometry();
        const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);

        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockReturnValue(start.promise);

        try {
            renderConversation(config.routes.conversations.create);

            await userEvent.type(screen.getByPlaceholderText('Enter prompt...'), prompt);
            await userEvent.keyboard('{Enter}');

            await waitFor(() => {
                expect(screen.getByText(prompt, { selector: 'p' })).toBeInTheDocument();
            });

            expect(document.querySelector('[data-turn-id="initial-turn"]')?.getAttribute('style')).toContain(
                `min-height: ${reservedAnswerHeight}px`
            );
            expect(scrollBy).toHaveBeenCalledWith({
                top: pinnedPromptTop - visibleChatTop - utils.spacing.measure('md'),
                behavior: 'smooth',
            });

            start.resolve({
                data: {
                    promptId: 'prompt-1',
                    turn: {
                        turnId: 'turn-1',
                        prompt,
                        startedAt: '2026-11-04T00:00:00.000Z',
                    },
                },
            });

            await waitFor(() => {
                expect(document.querySelector('[data-turn-id="turn-1"]')?.getAttribute('style')).toContain(
                    `min-height: ${reservedAnswerHeight}px`
                );
            });

            expect(document.querySelector('[data-turn-id="initial-turn"]')).not.toBeInTheDocument();
        } finally {
            geometry.mockRestore();
            scrollBy.mockRestore();
        }
    });

    it('does not reserve answer space when a saved conversation is opened', () => {
        const savedPrompt = 'Saved prompt';

        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'idle',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: savedPrompt,
                    answer: 'Saved answer',
                    finishedAt: '2026-11-04T00:00:01.000Z',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });

        renderConversation(`/conversations/${conversationId}`);

        expect(screen.getByText(savedPrompt, { selector: 'p' })).toBeInTheDocument();
        expect(document.querySelector('[data-turn-id="turn-1"]')?.getAttribute('style')).toBeNull();
        expect(document.querySelector('[data-pinned-prompt]')).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-CNV-005] opens a saved conversation with the newest turn in view', () => {
        const olderPrompt = 'Older prompt';
        const newerPrompt = 'Newer prompt';
        const feedBottom = visibleChatTop + 720;
        const viewportHeight = 600;

        useStore.getState().setSummaries([{ conversationId }]);
        useStore.getState().setConversation({
            conversationId,
            status: 'idle',
            turns: [
                {
                    turnId: 'turn-1',
                    prompt: olderPrompt,
                    answer: 'Older answer',
                    finishedAt: '2026-11-04T00:00:01.000Z',
                    streamEvents: [],
                    persistedEvents: [],
                },
                {
                    turnId: 'turn-2',
                    prompt: newerPrompt,
                    answer: 'Newer answer',
                    finishedAt: '2026-11-04T00:00:02.000Z',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });

        const geometry = mockChatGeometry();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
        const innerHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(viewportHeight);

        try {
            renderConversation(`/conversations/${conversationId}`);

            const older = screen.getByText(olderPrompt, { selector: 'p' });
            const newer = screen.getByText(newerPrompt, { selector: 'p' });

            expect(older.compareDocumentPosition(newer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(scrollTo).toHaveBeenCalledWith({
                top: feedBottom - viewportHeight,
                behavior: 'auto',
            });
            expect(document.querySelector('[data-pinned-prompt]')).not.toBeInTheDocument();
        } finally {
            geometry.mockRestore();
            scrollTo.mockRestore();
            innerHeight.mockRestore();
        }
    });

    it('restores selected turn ids from the URL and writes toggles back to one turnIds value', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            const { location } = renderConversation(`/conversations/${conversationId}?turnIds=turn-1&extra=1`);

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'true');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'false');
            expect(location.current.search).toBe('?turnIds=turn-1&extra=1');

            await userEvent.click(attachButton('turn-2'));

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'true');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'true');
            expect(location.current.search).toBe('?turnIds=turn-1%2Cturn-2&extra=1');

            await userEvent.click(attachButton('turn-1'));

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'false');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'true');
            expect(location.current.search).toBe('?turnIds=turn-2&extra=1');

            await userEvent.click(attachButton('turn-2'));

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'false');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'false');
            expect(location.current.search).toBe('?extra=1');
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('leaves every turn unselected when the URL has no turnIds', () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            const { location } = renderConversation(`/conversations/${conversationId}`);

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'false');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'false');
            expect(location.current.search).toBe('');
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('keeps an unknown turn id in the URL and drops empty segments when the selection changes', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            const { location } = renderConversation(`/conversations/${conversationId}?turnIds=turn-1,,missing`);

            expect(attachButton('turn-1')).toHaveAttribute('aria-pressed', 'true');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'false');
            expect(location.current.search).toBe('?turnIds=turn-1,,missing');

            await userEvent.click(attachButton('turn-2'));

            expect(location.current.search).toBe('?turnIds=turn-1%2Cmissing%2Cturn-2');
            expect(attachButton('turn-2')).toHaveAttribute('aria-pressed', 'true');
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('[CLIENT-MCP-CTX-004] / [FR-MCP-CTX-004] / [FR-MCP-CTX-005] shows an added turn in the composer and keeps it in the conversation', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            renderConversation(`/conversations/${conversationId}`);

            expect(within(composerGroup()).queryByText(firstPrompt)).not.toBeInTheDocument();

            await userEvent.click(attachButton('turn-1'));

            expect(within(composerGroup()).getByText(firstPrompt)).toBeInTheDocument();
            expect(within(composerGroup()).queryByText(secondPrompt)).not.toBeInTheDocument();
            expect(within(turnById('turn-1')).getByText(firstPrompt)).toBeInTheDocument();
            expect(within(turnById('turn-2')).getByText(secondPrompt)).toBeInTheDocument();
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('[CLIENT-MCP-CTX-005] / [FR-MCP-CTX-006] removes an added turn from the composer and keeps it in the conversation', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            renderConversation(`/conversations/${conversationId}`);

            await userEvent.click(attachButton('turn-1'));
            await userEvent.click(removeAttachedTurn(firstPrompt));

            expect(within(composerGroup()).queryByText(firstPrompt)).not.toBeInTheDocument();
            expect(within(turnById('turn-1')).getByText(firstPrompt)).toBeInTheDocument();
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('[CLIENT-MCP-CTX-006] / [FR-MCP-CTX-007] keeps added turns in the conversation address', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            const { location, unmount } = renderConversation(`/conversations/${conversationId}`);

            await userEvent.click(attachButton('turn-1'));

            expect(location.current.search).toContain('turn-1');
            expect(location.current.search).not.toContain('turn-2');

            const address = `/conversations/${conversationId}${location.current.search}`;

            unmount();
            const restored = renderConversation(address);

            expect(within(composerGroup()).getByText(firstPrompt)).toBeInTheDocument();
            expect(within(composerGroup()).queryByText(secondPrompt)).not.toBeInTheDocument();

            restored.unmount();
            renderConversation(`/conversations/${conversationId}`);

            expect(within(composerGroup()).queryByText(firstPrompt)).not.toBeInTheDocument();
            expect(within(composerGroup()).queryByText(secondPrompt)).not.toBeInTheDocument();
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('shows the full attached prompt in a popover on hover', async () => {
        seedFinishedTurns();
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            renderConversation(`/conversations/${conversationId}?turnIds=turn-1`);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            await userEvent.hover(within(composerGroup()).getByText(firstPrompt));

            expect(await screen.findByRole('dialog')).toHaveTextContent(firstPrompt);
        } finally {
            scrollTo.mockRestore();
        }
    });

    it('scrolls an attached turn to the top of the visible chat without reserving answer space', async () => {
        seedFinishedTurns();
        const geometry = mockChatGeometry();
        const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
        const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

        try {
            const { location } = renderConversation(`/conversations/${conversationId}?turnIds=turn-1`);

            await userEvent.click(within(composerGroup()).getByText(firstPrompt));

            expect(scrollBy).toHaveBeenCalledTimes(1);
            expect(scrollBy).toHaveBeenCalledWith({
                top: attachedTurnTop - visibleChatTop - utils.spacing.measure('md'),
                behavior: 'smooth',
            });
            expect(turnById('turn-1').getAttribute('style')).toBeNull();

            await userEvent.click(removeAttachedTurn(firstPrompt));

            expect(scrollBy).toHaveBeenCalledTimes(1);
            expect(location.current.search).toBe('');
        } finally {
            geometry.mockRestore();
            scrollBy.mockRestore();
            scrollTo.mockRestore();
        }
    });
});
