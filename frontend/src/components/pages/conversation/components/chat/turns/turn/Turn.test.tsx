import { render, screen } from '@testing-library/react';

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
    persistedEvents: TurnWithMessages['persistedEvents'] = []
): TurnWithMessages => ({
    turnId: 'turn-1',
    messages: [{ turnId: 'turn-1-prompt', prompt: 'Hello' }],
    streamEvents,
    persistedEvents,
});

/**
 * Renders one turn with a conversation status.
 */
const renderTurn = (
    streamEvents: McpStreamEvent[],
    conversationStatus: ConversationStatus,
    persistedEvents: TurnWithMessages['persistedEvents'] = []
) => {
    return render(
        <Turn turn={turn(streamEvents, persistedEvents)} conversationStatus={conversationStatus} composerHeight={0} />
    );
};

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

    it('[CLIENT-MCP-PRG-009] / [FR-MCP-PRG-011] / [FR-MCP-QST-002] / [FR-MCP-QST-003] shows a saved failed or refused call when the prompt is idle', () => {
        renderTurn([], 'idle', [
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
        ]);

        expect(screen.getByText('failed')).toBeInTheDocument();
        expect(screen.getByText('refused')).toBeInTheDocument();
        expect(screen.queryByText('Sending prompt...')).not.toBeInTheDocument();
    });
});
