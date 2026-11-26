import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TurnWithMessages } from '../types';
import type { McpStreamEvent } from '@/_types/_gen';
import type { ConversationStatus } from '@/shared/types/conversation';

import Turn from './Turn';
import {
    McpCallEventType,
    McpCallFailedEventKind,
    McpCallFailedEventStatus,
    McpCallProcessingEventKind,
    McpCallProcessingEventStatus,
    McpCallRefusedEventKind,
    McpCallRefusedEventStatus,
    McpCallSucceededToolEventKind,
    McpCallSucceededToolEventStatus,
    McpErrorEventType,
    McpPermissionEventKind,
    McpPermissionEventType,
    McpPersistedCallFailedEventKind,
    McpPersistedCallFailedEventStatus,
    McpPersistedCallRefusedEventKind,
    McpPersistedCallRefusedEventStatus,
    McpPersistedPermissionEventKind,
    McpPersistedPermissionEventType,
    McpSavingEventType,
    McpSelectingEventType,
    McpStoppedEventType,
} from '@/_types/_gen';

const conversationId = 'conversation-1';

const attachedTurnProps = {
    conversationId,
    isAttached: false,
    onTurnIdChange: () => undefined,
};
const promptId = 'prompt-1';
const userId = 'user-1';

/**
 * A turn with the given live steps and saved steps.
 */
const turn = (
    streamEvents: McpStreamEvent[],
    persistedEvents: TurnWithMessages['persistedEvents'] = [],
    finishedAt?: string
): TurnWithMessages => ({
    turnId: 'turn-1',
    finishedAt,
    messages: [{ turnId: 'turn-1-prompt', prompt: 'Hello' }],
    streamEvents,
    persistedEvents,
});

/**
 * Renders one turn with a conversation status.
 * A finished turn has `finishedAt`. An open turn omits it.
 */
const renderTurn = (
    streamEvents: McpStreamEvent[],
    conversationStatus: ConversationStatus,
    persistedEvents: TurnWithMessages['persistedEvents'] = [],
    finishedAt?: string
) => {
    return render(
        <Turn
            {...attachedTurnProps}
            turn={turn(streamEvents, persistedEvents, finishedAt)}
            conversationStatus={conversationStatus}
            composerHeight={0}
        />
    );
};

const savedSteps: TurnWithMessages['persistedEvents'] = [
    {
        type: McpPersistedPermissionEventType.permission,
        domain: 'weather',
        name: 'get_weather',
        kind: McpPersistedPermissionEventKind.tool,
        arguments: { city: 'Tokyo' },
    },
    {
        type: McpCallEventType.call,
        status: McpPersistedCallFailedEventStatus.failed,
        domain: 'weather',
        name: 'get_weather',
        kind: McpPersistedCallFailedEventKind.tool,
        arguments: { city: 'Tokyo' },
    },
    {
        type: McpPersistedPermissionEventType.permission,
        domain: 'weather',
        name: 'get_alerts',
        kind: McpPersistedPermissionEventKind.resource,
        arguments: { region: null },
    },
    {
        type: McpCallEventType.call,
        status: McpPersistedCallRefusedEventStatus.refused,
        domain: 'weather',
        name: 'get_alerts',
        kind: McpPersistedCallRefusedEventKind.resource,
        arguments: { region: null },
    },
];

const finishedAt = '2026-11-04T00:00:01.000Z';

/**
 * One live call. The status line uses the name and the status of the latest call only.
 */
const toolCall = (name: string, status: 'processing' | 'succeeded' | 'failed' | 'refused'): McpStreamEvent => {
    const shared = {
        type: McpCallEventType.call,
        conversationId,
        promptId,
        userId,
        domain: 'weather',
        name,
        arguments: { city: 'Tokyo' },
    };

    if (status === 'processing') {
        return {
            ...shared,
            kind: McpCallProcessingEventKind.tool,
            status: McpCallProcessingEventStatus.processing,
        };
    }

    if (status === 'succeeded') {
        return {
            ...shared,
            kind: McpCallSucceededToolEventKind.tool,
            status: McpCallSucceededToolEventStatus.succeeded,
            result: { content: [{ type: 'text', text: 'sunny' }] },
        };
    }

    if (status === 'failed') {
        return {
            ...shared,
            kind: McpCallFailedEventKind.tool,
            status: McpCallFailedEventStatus.failed,
        };
    }

    return {
        ...shared,
        kind: McpCallRefusedEventKind.tool,
        status: McpCallRefusedEventStatus.refused,
    };
};

/**
 * Matches visible text that contains each part, whatever the surrounding wording.
 */
const includes =
    (...parts: string[]) =>
    (content: string) =>
        parts.every(part => content.includes(part));

describe('Turn status indicator', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('keeps a turn collapsed or expanded after it is shown again', async () => {
        const props = {
            ...attachedTurnProps,
            turn: turn([], [], '2026-11-04T00:00:01.000Z'),
            conversationStatus: 'idle' as const,
            composerHeight: 0,
        };

        const trigger = () => {
            const element = document.querySelector('[data-slot="collapsible-trigger"]');

            if (!(element instanceof HTMLElement)) {
                throw new Error('No turn trigger');
            }

            return element;
        };

        const chevron = () => {
            const icon = trigger().querySelector('svg');

            if (!(icon instanceof SVGElement)) {
                throw new Error('No turn chevron');
            }

            return icon;
        };

        const first = render(<Turn {...props} />);

        await userEvent.click(chevron());

        expect(trigger()).toHaveAttribute('aria-expanded', 'false');

        first.unmount();

        const second = render(<Turn {...props} />);

        expect(trigger()).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(chevron());

        expect(trigger()).toHaveAttribute('aria-expanded', 'true');

        second.unmount();
        render(<Turn {...props} />);

        expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('shows the prompt in the turn trigger only while the turn is collapsed', async () => {
        renderTurn([], 'idle', [], '2026-11-04T00:00:01.000Z');

        const trigger = document.querySelector('[data-slot="collapsible-trigger"]');

        if (!(trigger instanceof HTMLElement)) {
            throw new Error('No turn trigger');
        }

        const chevron = trigger.querySelector('svg');

        if (!(chevron instanceof SVGElement)) {
            throw new Error('No turn chevron');
        }

        expect(trigger).not.toHaveTextContent('Hello');
        expect(screen.getByText('Hello')).toBeInTheDocument();

        await userEvent.click(chevron);

        expect(trigger.querySelector('.truncate')).toHaveTextContent('Hello');

        await userEvent.click(chevron);

        expect(trigger).not.toHaveTextContent('Hello');
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('[CLIENT-MCP-PRG-008] / [FR-MCP-PRG-011] shows the latest step while the prompt is being answered', () => {
        const view = renderTurn([], 'processing');

        expect(screen.getByText(includes('Sending'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpSelectingEventType.selecting,
                        conversationId,
                        promptId,
                        userId,
                    },
                ])}
                conversationStatus="processing"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('Selecting'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpPermissionEventType.permission,
                        conversationId,
                        promptId,
                        userId,
                        domain: 'weather',
                        name: 'get_weather',
                        kind: McpPermissionEventKind.tool,
                        arguments: { city: 'Tokyo' },
                    },
                ])}
                conversationStatus="permission"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('get_weather', 'weather', 'city', 'Tokyo'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpCallEventType.call,
                        status: McpCallFailedEventStatus.failed,
                        conversationId,
                        promptId,
                        userId,
                        domain: 'weather',
                        name: 'get_weather',
                        kind: McpCallFailedEventKind.tool,
                        arguments: { city: 'Tokyo' },
                    },
                ])}
                conversationStatus="processing"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('get_weather', 'failed'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpCallEventType.call,
                        status: McpCallRefusedEventStatus.refused,
                        conversationId,
                        promptId,
                        userId,
                        domain: 'weather',
                        name: 'get_alerts',
                        kind: McpCallRefusedEventKind.tool,
                        arguments: { region: 'Kanto' },
                    },
                ])}
                conversationStatus="processing"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('get_alerts', 'refused'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpSavingEventType.saving,
                        conversationId,
                        promptId,
                        userId,
                    },
                ])}
                conversationStatus="processing"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('Saving'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([
                    {
                        type: McpErrorEventType.error,
                        conversationId,
                        promptId,
                        userId,
                        context: 'The model failed',
                        messages: [],
                    },
                ])}
                conversationStatus="error"
                composerHeight={0}
            />
        );
        expect(screen.getByText(includes('The model failed'))).toBeInTheDocument();
    });

    it('[CLIENT-MCP-QUE-001] / [CLIENT-MCP-QUE-002] / [FR-MCP-QUE-001] / [FR-MCP-QUE-002] shows only the current tool or resource, by name', () => {
        renderTurn([toolCall('get_weather', 'failed'), toolCall('get_alerts', 'succeeded')], 'processing');

        expect(screen.getByText(includes('get_alerts', 'succeeded'))).toBeInTheDocument();
        expect(screen.queryByText(includes('get_weather', 'failed'))).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-QUE-004] / [FR-MCP-QUE-003] hides saved events while the prompt is being answered', () => {
        renderTurn([toolCall('get_weather', 'processing')], 'processing');

        expect(screen.getByText(includes('Processing', 'get_weather'))).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Events/ })).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-QST-001] / [FR-MCP-QST-001] shows processing, then succeeded', () => {
        const view = renderTurn([toolCall('get_weather', 'processing')], 'processing');

        expect(screen.getByText(includes('Processing', 'get_weather'))).toBeInTheDocument();

        view.rerender(
            <Turn
                {...attachedTurnProps}
                turn={turn([toolCall('get_weather', 'processing'), toolCall('get_weather', 'succeeded')])}
                conversationStatus="processing"
                composerHeight={0}
            />
        );

        expect(screen.getByText(includes('get_weather', 'succeeded'))).toBeInTheDocument();
        expect(screen.queryByText(includes('Processing', 'get_weather'))).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-QST-002] / [FR-MCP-QST-002] shows failed, distinct from succeeded', () => {
        renderTurn([toolCall('get_alerts', 'succeeded'), toolCall('get_weather', 'failed')], 'processing');

        expect(screen.getByText(includes('get_weather', 'failed'))).toBeInTheDocument();
        expect(screen.queryByText(includes('get_alerts', 'succeeded'))).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-QST-003] / [FR-MCP-QST-003] shows refused, distinct from processing, succeeded, and failed', () => {
        renderTurn(
            [
                toolCall('get_weather', 'processing'),
                toolCall('get_weather', 'succeeded'),
                toolCall('get_alerts', 'failed'),
                toolCall('get_forecast', 'refused'),
            ],
            'processing'
        );

        expect(screen.getByText(includes('get_forecast', 'refused'))).toBeInTheDocument();
        expect(screen.queryByText(includes('Processing', 'get_weather'))).not.toBeInTheDocument();
        expect(screen.queryByText(includes('get_weather', 'succeeded'))).not.toBeInTheDocument();
        expect(screen.queryByText(includes('get_alerts', 'failed'))).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-STP-001] / [FR-MCP-STP-005] shows stopped after the conversation is idle', () => {
        render(
            <Turn
                {...attachedTurnProps}
                turn={{
                    ...turn([
                        {
                            type: McpStoppedEventType.stopped,
                            conversationId,
                            promptId,
                            userId,
                            messages: [],
                        },
                    ]),
                    end: 'stopped',
                }}
                conversationStatus="idle"
                composerHeight={0}
            />
        );

        expect(screen.getByText(includes('stopped'))).toBeInTheDocument();
        expect(screen.queryByText(includes('Sending'))).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-FLR-001] / [FR-MCP-FLR-002] shows the error context after the prompt ends', () => {
        render(
            <Turn
                {...attachedTurnProps}
                turn={{
                    ...turn([
                        {
                            type: McpErrorEventType.error,
                            conversationId,
                            promptId,
                            userId,
                            context: 'The model failed',
                            messages: [],
                        },
                    ]),
                    end: 'error',
                }}
                conversationStatus="idle"
                composerHeight={0}
            />
        );

        expect(screen.getByText(includes('The model failed'))).toBeInTheDocument();
    });

    it('[CLIENT-MCP-QUE-003] / [CLIENT-MCP-QUE-005] / [CLIENT-MCP-PRG-004] / [CLIENT-MCP-PRG-009] / [FR-MCP-QUE-003] / [FR-MCP-QUE-004] / [FR-MCP-PRG-007] / [FR-MCP-PRG-011] shows saved events collapsed until they are opened', async () => {
        renderTurn([], 'idle', savedSteps, finishedAt);

        const events = screen.getByRole('button', { name: /Events/ });

        expect(events).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText(includes('get_weather'))).not.toBeInTheDocument();
        expect(screen.queryByText(includes('failed'))).not.toBeInTheDocument();
        expect(screen.queryByText(includes('Sending'))).not.toBeInTheDocument();

        await userEvent.click(events);

        expect(screen.getAllByText(includes('weather')).length).toBeGreaterThan(0);
        expect(screen.getByText(includes('get_weather'))).toBeInTheDocument();
        expect(screen.getByText(includes('get_alerts'))).toBeInTheDocument();
        expect(screen.getByText(includes('failed'))).toBeInTheDocument();
        expect(screen.getByText(includes('refused'))).toBeInTheDocument();
    });

    it('reserves answer space on the submitted turn and leaves earlier turns at their content height', () => {
        const earlierTurn = turn([], savedSteps, finishedAt);
        const submittedTurn: TurnWithMessages = {
            ...turn([]),
            turnId: 'turn-2',
            messages: [{ turnId: 'turn-2-prompt', prompt: 'Next question' }],
        };

        render(
            <>
                <Turn
                    {...attachedTurnProps}
                    turn={earlierTurn}
                    conversationStatus="processing"
                    composerHeight={0}
                    pinnedTurnId="turn-2"
                    answerMinHeight={480}
                />
                <Turn
                    {...attachedTurnProps}
                    turn={submittedTurn}
                    conversationStatus="processing"
                    composerHeight={0}
                    pinnedTurnId="turn-2"
                    answerMinHeight={480}
                />
            </>
        );

        expect(document.querySelector('[data-turn-id="turn-1"]')?.getAttribute('style')).toBeNull();
        expect(document.querySelector('[data-turn-id="turn-2"]')?.getAttribute('style')).toContain('min-height: 480px');
        expect(document.querySelector('[data-turn-id="turn-2"] [data-pinned-prompt]')).toHaveTextContent(
            'Next question'
        );
        expect(document.querySelector('[data-turn-id="turn-1"] [data-pinned-prompt]')).toBeNull();
    });

    it('[CLIENT-MCP-PRG-008] / [CLIENT-MCP-PRG-009] / [CLIENT-MCP-QUE-003] keeps the live indicator off a finished turn while another prompt is open', async () => {
        renderTurn([], 'processing', savedSteps, finishedAt);

        const events = screen.getByRole('button', { name: /Events/ });

        expect(screen.queryByText(includes('Sending'))).not.toBeInTheDocument();
        expect(events).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(events);

        expect(screen.getByText(includes('failed'))).toBeInTheDocument();
        expect(screen.getByText(includes('refused'))).toBeInTheDocument();
    });
});
