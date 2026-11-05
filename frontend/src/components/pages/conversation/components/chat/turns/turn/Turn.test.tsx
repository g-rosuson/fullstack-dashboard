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
    McpCallRefusedEventKind,
    McpCallRefusedEventStatus,
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
} from '@/_types/_gen';

const conversationId = 'conversation-1';
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

describe('Turn status indicator', () => {
    it('[CLIENT-MCP-PRG-008] / [FR-MCP-PRG-011] shows the latest step while the prompt is being answered', () => {
        const view = renderTurn([], 'processing');

        expect(screen.getByText('Sending prompt...')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('Selecting resources...')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('Grant model access to "get_weather"?')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('The "get_weather" resource failed')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('The "get_alerts" resource was refused')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('Saving the conversation...')).toBeInTheDocument();

        view.rerender(
            <Turn
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
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('[CLIENT-MCP-PRG-009] / [FR-MCP-PRG-011] / [FR-MCP-QST-002] / [FR-MCP-QST-003] shows a saved failed or refused call when the prompt is idle', async () => {
        renderTurn([], 'idle', savedSteps, finishedAt);

        await userEvent.click(screen.getByRole('button', { name: 'Events (2)' }));

        expect(screen.getByText('failed')).toBeInTheDocument();
        expect(screen.getByText('refused')).toBeInTheDocument();
        expect(screen.queryByText('Sending prompt...')).not.toBeInTheDocument();
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
                    turn={earlierTurn}
                    conversationStatus="processing"
                    composerHeight={0}
                    pinnedTurnId="turn-2"
                    answerMinHeight={480}
                />
                <Turn
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
        expect(screen.getByText('Next question').closest('[data-pinned-prompt]')).toHaveClass('mt-md');
        expect(screen.getByText('Hello').closest('[data-pinned-prompt]')).toBeNull();
    });

    it('[CLIENT-MCP-PRG-008] / [CLIENT-MCP-PRG-009] keeps the live indicator off a finished turn while another prompt is open', async () => {
        renderTurn([], 'processing', savedSteps, finishedAt);

        expect(screen.queryByText('Sending prompt...')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Events (2)' }));

        expect(screen.getByText('failed')).toBeInTheDocument();
        expect(screen.getByText('refused')).toBeInTheDocument();
    });
});
