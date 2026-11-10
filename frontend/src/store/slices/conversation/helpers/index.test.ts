import type { TurnStreamEvent } from '../types';
import type { Conversation, ConversationTurn } from '@/shared/types/conversation';

import helpers from './index';
import {
    AggregatedPromptPhase,
    AggregatedPromptsEventType,
    type McpAnswerEvent,
    McpAnswerEventType,
    McpCallEventType,
    type McpCallFailedEvent,
    McpCallFailedEventKind,
    McpCallFailedEventStatus,
    type McpCallRefusedEvent,
    McpCallRefusedEventKind,
    McpCallRefusedEventStatus,
    type McpErrorEvent,
    McpErrorEventType,
    type McpPermissionEvent,
    McpPermissionEventKind,
    McpPermissionEventType,
    type McpSavingEvent,
    McpSavingEventType,
    type McpSelectingEvent,
    McpSelectingEventType,
    type McpStoppedEvent,
    McpStoppedEventType,
} from '@/_types/_gen';

const conversationId = 'conversation-1';
const promptId = 'prompt-1';
const userId = 'user-1';

/**
 * An unfinished turn with no live steps.
 */
const openTurn = (): ConversationTurn => ({
    turnId: 'turn-1',
    prompt: 'Hello',
    streamEvents: [],
    persistedEvents: [],
});

/**
 * A conversation map that already holds the open turn.
 */
const stored = (turn: ConversationTurn = openTurn()): Map<string, Conversation> => {
    const conversations = new Map<string, Conversation>();

    conversations.set(conversationId, {
        conversationId,
        status: 'idle',
        turns: [turn],
    });

    return conversations;
};

const selecting = {
    type: McpSelectingEventType.selecting,
    conversationId,
    promptId,
    userId,
} satisfies McpSelectingEvent;

const permission = {
    type: McpPermissionEventType.permission,
    conversationId,
    promptId,
    userId,
    domain: 'weather',
    name: 'get_weather',
    kind: McpPermissionEventKind.tool,
    arguments: { city: 'Tokyo' },
} satisfies McpPermissionEvent;

const callFailed = {
    type: McpCallEventType.call,
    status: McpCallFailedEventStatus.failed,
    conversationId,
    promptId,
    userId,
    domain: 'weather',
    name: 'get_weather',
    kind: McpCallFailedEventKind.tool,
    arguments: { city: 'Tokyo' },
} satisfies McpCallFailedEvent;

const callRefused = {
    type: McpCallEventType.call,
    status: McpCallRefusedEventStatus.refused,
    conversationId,
    promptId,
    userId,
    domain: 'weather',
    name: 'get_weather',
    kind: McpCallRefusedEventKind.tool,
    arguments: { city: 'Tokyo' },
} satisfies McpCallRefusedEvent;

const saving = {
    type: McpSavingEventType.saving,
    conversationId,
    promptId,
    userId,
} satisfies McpSavingEvent;

const failed = {
    type: McpErrorEventType.error,
    conversationId,
    promptId,
    userId,
    context: 'The model failed',
    messages: [],
} satisfies McpErrorEvent;

const answered = {
    type: McpAnswerEventType.answer,
    conversationId,
    promptId,
    userId,
    content: 'Done',
    prompt: 'Hello',
    turnId: 'turn-1',
    startedAt: '2026-11-04T00:00:00.000Z',
    finishedAt: '2026-11-04T00:00:01.000Z',
    domains: [],
    list: { tools: [], resources: [] },
    messages: [],
} satisfies McpAnswerEvent;

const stopped = {
    type: McpStoppedEventType.stopped,
    conversationId,
    promptId,
    userId,
    messages: [],
} satisfies McpStoppedEvent;

/**
 * The status stored after one live step lands on the open turn.
 */
const statusAfter = (event: TurnStreamEvent) => {
    const next = helpers.recordTurnStreamEvent(stored(), [], event);

    return next.conversations.get(conversationId)?.status;
};

describe('conversation status helpers', () => {
    it('[FR-MCP-CST-002] selecting, calling, and saving are processing', () => {
        expect(statusAfter(selecting)).toBe('processing');
        expect(statusAfter(callFailed)).toBe('processing');
        expect(statusAfter(saving)).toBe('processing');
    });

    it('[CLIENT-MCP-CST-002] / [FR-MCP-CST-003] a failed or refused call stays processing', () => {
        const afterFailure = helpers.recordTurnStreamEvent(
            helpers.recordTurnStreamEvent(stored(), [], selecting).conversations,
            [],
            callFailed
        );
        const afterRefusal = helpers.recordTurnStreamEvent(
            helpers.recordTurnStreamEvent(stored(), [], selecting).conversations,
            [],
            callRefused
        );

        expect(afterFailure.conversations.get(conversationId)?.status).toBe('processing');
        expect(afterRefusal.conversations.get(conversationId)?.status).toBe('processing');
    });

    it('[FR-MCP-CST-004] an open ask is waiting for permission', () => {
        expect(statusAfter(permission)).toBe('permission');
    });

    it('[FR-MCP-CST-005] a prompt error is failed', () => {
        expect(statusAfter(failed)).toBe('error');
    });

    it('[CLIENT-MCP-CST-004] / [FR-MCP-CST-006] an answer or a stop clears a failed conversation', () => {
        const failedConversation = helpers.recordTurnStreamEvent(stored(), [], failed).conversations;
        const failedTurn = failedConversation.get(conversationId);
        const withNextPrompt = new Map(failedConversation);

        withNextPrompt.set(conversationId, {
            conversationId,
            status: failedTurn?.status ?? 'error',
            turns: [
                ...(failedTurn?.turns ?? []),
                {
                    turnId: 'turn-2',
                    prompt: 'Next',
                    promptId: 'prompt-2',
                    streamEvents: [],
                    persistedEvents: [],
                },
            ],
        });

        expect(
            helpers.recordTurnStreamEvent(withNextPrompt, [], { ...answered, turnId: 'turn-2', promptId: 'prompt-2' })
                .conversations.get(conversationId)?.status
        ).toBe('idle');
        expect(
            helpers.recordTurnStreamEvent(withNextPrompt, [], { ...stopped, promptId: 'prompt-2' }).conversations.get(
                conversationId
            )?.status
        ).toBe('idle');
    });

    it('[CLIENT-MCP-STP-001] / [CLIENT-MCP-FLR-001] a stop or an error ends the turn without an answer', () => {
        const afterStop = helpers.recordTurnStreamEvent(stored(), [], stopped);
        const stoppedTurn = afterStop.conversations.get(conversationId)?.turns[0];
        const later = helpers.recordTurnStreamEvent(afterStop.conversations, [], selecting);
        const afterError = helpers.recordTurnStreamEvent(stored(), [], failed);
        const errorTurn = afterError.conversations.get(conversationId)?.turns[0];

        expect(afterStop.conversations.get(conversationId)?.status).toBe('idle');
        expect(stoppedTurn?.end).toBe('stopped');
        expect(stoppedTurn?.finishedAt).toBeUndefined();
        expect(stoppedTurn?.answer).toBeUndefined();
        expect(stoppedTurn?.persistedEvents).toEqual([]);
        expect(later.pendingTurnEvents).toEqual([selecting]);
        expect(later.conversations.get(conversationId)?.turns[0]?.streamEvents.at(-1)?.type).toBe(
            McpStoppedEventType.stopped
        );
        expect(afterError.conversations.get(conversationId)?.status).toBe('error');
        expect(errorTurn?.end).toBe('error');
        expect(errorTurn?.finishedAt).toBeUndefined();
        expect(errorTurn?.answer).toBeUndefined();
        expect(helpers.openTurn(afterStop.conversations.get(conversationId))).toBeUndefined();
        expect(helpers.openTurn(afterError.conversations.get(conversationId))).toBeUndefined();
    });

    it('[CLIENT-MCP-CNV-005] an answer writes the finished turn', () => {
        const withPermission = helpers.recordTurnStreamEvent(stored(), [], permission).conversations;
        const withCall = helpers.recordTurnStreamEvent(withPermission, [], callFailed).conversations;
        const finished = helpers.recordTurnStreamEvent(withCall, [], answered);
        const turn = finished.conversations.get(conversationId)?.turns[0];

        expect(turn?.answer).toBe('Done');
        expect(turn?.startedAt).toBe(answered.startedAt);
        expect(turn?.finishedAt).toBe(answered.finishedAt);
        expect(turn?.domains).toEqual([]);
        expect(turn?.list).toEqual(answered.list);
        expect(turn?.persistedEvents).toEqual([
            {
                type: permission.type,
                domain: permission.domain,
                name: permission.name,
                kind: permission.kind,
                arguments: permission.arguments,
            },
            {
                type: callFailed.type,
                status: callFailed.status,
                domain: callFailed.domain,
                name: callFailed.name,
                kind: callFailed.kind,
                arguments: callFailed.arguments,
            },
        ]);
    });

    it('[CLIENT-MCP-CNV-005] an answer that arrives before the turn is stored still finishes it', () => {
        const held = helpers.recordTurnStreamEvent(new Map(), [], answered);
        const attached = helpers.attachPendingTurnEvents(
            {
                conversationId,
                status: 'processing',
                turns: [openTurn()],
            },
            held.pendingTurnEvents
        );

        expect(attached.conversation.status).toBe('idle');
        expect(attached.conversation.turns[0]?.answer).toBe('Done');
        expect(attached.conversation.turns[0]?.finishedAt).toBe(answered.finishedAt);
        expect(attached.pendingTurnEvents).toEqual([]);
    });

    it('[CLIENT-MCP-PRG-007] / [FR-MCP-PRG-001] keeps a step that arrives before the turn is stored', () => {
        const held = helpers.recordTurnStreamEvent(new Map(), [], selecting);
        const attached = helpers.attachPendingTurnEvents(
            {
                conversationId,
                status: 'processing',
                turns: [openTurn()],
            },
            held.pendingTurnEvents
        );

        expect(held.conversations.size).toBe(0);
        expect(held.pendingTurnEvents).toEqual([selecting]);
        expect(attached.pendingTurnEvents).toEqual([]);
        expect(attached.conversation.turns[0]?.streamEvents).toEqual([selecting]);
        expect(attached.conversation.status).toBe('processing');
    });

    it('[CLIENT-MCP-CST-005] / [FR-MCP-CST-002] applies the snapshot when the conversation is loaded later', () => {
        const remembered = helpers.rememberPromptEvents(new Map(), [], {
            type: AggregatedPromptsEventType['prompt-events'],
            userId,
            prompts: [
                {
                    conversationId,
                    promptId,
                    prompt: 'Hello',
                    phase: AggregatedPromptPhase.permission,
                    emittedEvents: [selecting, permission],
                },
                {
                    conversationId: 'conversation-2',
                    promptId: 'prompt-2',
                    prompt: 'Save',
                    phase: AggregatedPromptPhase.saving,
                    emittedEvents: [saving],
                },
            ],
        });
        const waiting = helpers.conversationFromRead(conversationId, [openTurn()], remembered.promptEvents);
        const savingConversation = helpers.conversationFromRead(
            'conversation-2',
            [{ ...openTurn(), turnId: 'turn-2', prompt: 'Save' }],
            remembered.promptEvents
        );
        const finished = helpers.conversationFromRead(
            conversationId,
            [{ ...openTurn(), finishedAt: '2026-11-04T00:00:01.000Z' }],
            remembered.promptEvents
        );
        const unfinishedWithoutSnapshot = helpers.conversationFromRead('conversation-3', [openTurn()], null);
        const seeded = helpers.seedTurnStreamEvents(stored(), remembered.promptEvents);

        expect(waiting.status).toBe('permission');
        expect(waiting.turns[0]?.promptId).toBe(promptId);
        expect(waiting.turns[0]?.streamEvents).toEqual([selecting, permission]);
        expect(savingConversation.status).toBe('processing');
        expect(savingConversation.turns[0]?.promptId).toBe('prompt-2');
        expect(finished.status).toBe('idle');
        expect(finished.turns[0]?.streamEvents).toEqual([]);
        expect(unfinishedWithoutSnapshot.status).toBe('processing');
        expect(seeded.get(conversationId)?.turns[0]?.promptId).toBe(promptId);
    });
});
