import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, type Mock } from 'vitest';

import Dashboard from '@/components/layout/dashboard/Dashboard';

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
 */
const renderConversation = (path: string) => {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route element={<Dashboard />}>
                    <Route path={config.routes.conversations.create} element={<Conversation />} />
                    <Route path={config.routes.conversations.conversation} element={<Conversation />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
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

        const composer = screen.getByPlaceholderText('Enter prompt here...');

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
            expect(screen.getByPlaceholderText('Enter prompt here...')).toHaveValue('');
        });
    });

    it('[CLIENT-MCP-CNV-009] / [FR-MCP-CST-005] keeps a conversation whose prompt does not start and shows the error border', async () => {
        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockRejectedValue(new Error('did not start'));

        renderConversation(config.routes.conversations.create);

        await userEvent.type(screen.getByPlaceholderText('Enter prompt here...'), prompt);
        await userEvent.keyboard('{Enter}');

        await waitFor(() => {
            expect(destinationByLabel(conversationId)).toHaveClass('border-destructive');
            expect(destinationByLabel(conversationId)).toHaveAttribute('data-active', 'true');
            expect(screen.getByText(prompt, { selector: 'p' })).toBeInTheDocument();
            expect(screen.getByText('An error occurred')).toBeInTheDocument();
        });

        expect(destinationByLabel(conversationId)).toHaveTextContent(conversationId);
    });

    it('[CLIENT-MCP-CNV-010] / [FR-MCP-CNV-008] does not send a second prompt while the first request is in flight', async () => {
        const start = deferred<{
            data: { promptId: string; turn: { turnId: string; prompt: string; startedAt: string } };
        }>();

        (api.service.resources.mcp.create as Mock).mockResolvedValue({ data: { conversationId } });
        (api.service.resources.mcp.startPrompt as Mock).mockReturnValue(start.promise);

        renderConversation(config.routes.conversations.create);

        const composer = screen.getByPlaceholderText('Enter prompt here...');

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

        expect(screen.getByPlaceholderText('Enter prompt here...')).toBeDisabled();
        expect(api.service.resources.mcp.startPrompt).not.toHaveBeenCalled();
        expect(api.service.resources.mcp.create).not.toHaveBeenCalled();
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

            await userEvent.type(screen.getByPlaceholderText('Enter prompt here...'), prompt);
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
});
