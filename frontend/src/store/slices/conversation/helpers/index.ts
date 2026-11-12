import { openTurnIndex } from '@/shared/helpers/conversation';

import type { TurnStreamEvent } from '../types';
import type {
    AggregatedPromptsEvent,
    McpAnswerEvent,
    McpConversationSummary,
    McpPersistedPromptEvent,
    McpStreamEvent,
} from '@/_types/_gen';
import type { Conversation, ConversationStatus, ConversationTurn } from '@/shared/types/conversation';

import {
    AggregatedPromptPhase,
    McpAnswerEventType,
    McpCallEventType,
    McpErrorEventType,
    McpPermissionEventType,
    McpSavingEventType,
    McpSelectingEventType,
    McpStoppedEventType,
} from '@/_types/_gen';

/**
 * Removes a summary from the list of summaries.
 * @param conversationId - The ID of the conversation to remove the summary for.
 * @param summaries - The list of summaries to remove the summary from.
 * @returns The list of summaries without the summary for the given conversation ID.
 */
const removeSummary = (conversationId: string, summaries: McpConversationSummary[]) => {
    return summaries.filter(summary => summary.conversationId !== conversationId);
};

/**
 * Drops a conversation from the map.
 * @param conversations - The stored conversations.
 * @param conversationId - The conversation to drop.
 * @returns The map without that conversation.
 */
const removeConversation = (
    conversations: Map<string, Conversation>,
    conversationId: string
): Map<string, Conversation> => {
    const nextMapInstance = new Map(conversations);

    nextMapInstance.delete(conversationId);

    return nextMapInstance;
};

/**
 * Adds a conversation to the map.
 * @param activeConversationsMap - The map of conversations to add the conversation to.
 * @param conversation - The conversation to add.
 * @returns The map with the conversation added.
 */
const setConversation = (
    conversations: Map<string, Conversation>,
    conversation: Conversation
): Map<string, Conversation> => {
    const nextMapInstance = new Map(conversations);

    nextMapInstance.set(conversation.conversationId, conversation);

    return nextMapInstance;
};

/**
 * Appends a turn to a conversation.
 * @param conversations - The map of conversations to update.
 * @param conversationId - The ID of the conversation to add the turn to.
 * @param turn - The turn to append.
 * @returns The map with the turn appended.
 */
const addConversationTurn = (
    conversations: Map<string, Conversation>,
    conversationId: string,
    turn: ConversationTurn
): Map<string, Conversation> => {
    const nextMapInstance = new Map(conversations);
    const conversation = nextMapInstance.get(conversationId);

    if (!conversation) {
        throw new Error(`Cannot add turn to conversation ${conversationId} because it does not exist`);
    }

    nextMapInstance.set(conversationId, { ...conversation, turns: [...conversation.turns, turn] });

    return nextMapInstance;
};

/**
 * Replaces one turn on a conversation.
 * @param conversations - The map of conversations to update.
 * @param conversationId - The ID of the conversation that holds the turn.
 * @param turn - The turn to store in place of the one with the same turnId.
 * @returns The map with that turn replaced.
 */
const updateConversationTurn = (
    conversations: Map<string, Conversation>,
    conversationId: string,
    turn: ConversationTurn
): Map<string, Conversation> => {
    const conversation = conversations.get(conversationId);
    const turnIndex = conversation?.turns.findIndex(existingTurn => existingTurn.turnId === turn.turnId) ?? -1;

    if (!conversation || turnIndex === -1) {
        throw new Error(
            `Cannot update turn ${turn.turnId} on conversation ${conversationId} because it does not exist`
        );
    }

    const nextMapInstance = new Map(conversations);

    nextMapInstance.set(conversationId, {
        ...conversation,
        turns: conversation.turns.map((existingTurn, index) => (index === turnIndex ? turn : existingTurn)),
    });

    return nextMapInstance;
};

/**
 * Sets the status of a conversation and keeps its turns.
 * @param conversations - The map of conversations to update.
 * @param conversationId - The ID of the conversation to update.
 * @param status - The status to store.
 * @returns The map with that status updated.
 */
const setConversationStatus = (
    conversations: Map<string, Conversation>,
    conversationId: string,
    status: ConversationStatus
): Map<string, Conversation> => {
    const conversation = conversations.get(conversationId);

    if (!conversation) {
        throw new Error(`Cannot update status for conversation ${conversationId} because it does not exist`);
    }

    const nextMapInstance = new Map(conversations);

    nextMapInstance.set(conversationId, {
        ...conversation,
        status,
    });

    return nextMapInstance;
};

/**
 * Status stored for a live prompt step.
 * `call` stays processing for every call status, including a failed or refused call.
 * @param event - The live step.
 * @returns The status that step stores.
 */
const statusForTurnStreamEvent = (event: TurnStreamEvent): ConversationStatus => {
    switch (event.type) {
        case McpPermissionEventType.permission:
            return 'permission';
        case McpSelectingEventType.selecting:
        case McpCallEventType.call:
        case McpSavingEventType.saving:
            return 'processing';
        case McpAnswerEventType.answer:
        case McpStoppedEventType.stopped:
            return 'idle';
        case McpErrorEventType.error:
            return 'error';
    }
};

/**
 * Status stored for a prompt that is still being answered.
 * @param phase - The phase from the connect snapshot.
 * @returns The status that phase stores.
 */
const statusForPromptPhase = (phase: AggregatedPromptPhase): ConversationStatus => {
    switch (phase) {
        case AggregatedPromptPhase.permission:
            return 'permission';
        case AggregatedPromptPhase.selecting:
        case AggregatedPromptPhase.calling:
        case AggregatedPromptPhase.saving:
            return 'processing';
    }
};

/**
 * Appends live steps onto a turn.
 * An answer writes its text, times, domains, and list onto that turn, and keeps its permission and call steps.
 * A stop or an error ends that turn without an answer, so a later prompt does not reuse it.
 * @param turn - The open turn.
 * @param events - The steps to append, oldest first.
 * @returns The turn with those steps applied.
 */
const applyStreamEvents = (turn: ConversationTurn, events: TurnStreamEvent[]): ConversationTurn => {
    /**
     * "permission" and "call" events are only persisted.
     * @param event - The live step.
     * @returns Whether that step is saved with the answer.
     */
    const shouldBePersisted = (
        event: McpStreamEvent
    ): event is Extract<McpStreamEvent, { type: 'permission' | 'call' }> =>
        event.type === McpPermissionEventType.permission || event.type === McpCallEventType.call;

    /**
     * Drops the stream-only ids from a saved step.
     * @param event - A permission or a call.
     * @returns That step as stored on the turn.
     */
    const dropStreamOnlyIds = (
        event: Extract<McpStreamEvent, { type: 'permission' | 'call' }>
    ): McpPersistedPromptEvent => {
        const { conversationId: _conversationId, promptId: _promptId, userId: _userId, ...step } = event;

        return step;
    };

    /**
     * The newest answer among these steps.
     * Steps are oldest first, so the list is reversed and the first answer is the newest.
     * @param events - The steps being applied, oldest first.
     * @returns That answer, or none when these steps do not finish the turn.
     */
    const latestAnswer = (events: TurnStreamEvent[]): McpAnswerEvent | undefined => {
        const isAnswer = (event: TurnStreamEvent): event is McpAnswerEvent => event.type === McpAnswerEventType.answer;

        return [...events].reverse().find(isAnswer);
    };

    /**
     * The newest stop or error among these steps.
     * Steps are oldest first, so the list is reversed and the first end is the newest.
     * @param events - The steps being applied, oldest first.
     * @returns How that prompt ended, or none when it is still being answered.
     */
    const latestEnd = (events: TurnStreamEvent[]): ConversationTurn['end'] => {
        for (let index = events.length - 1; index >= 0; index -= 1) {
            const event = events[index];

            if (event?.type === McpStoppedEventType.stopped) {
                return 'stopped';
            }

            if (event?.type === McpErrorEventType.error) {
                return 'error';
            }
        }

        return undefined;
    };

    const streamEvents = [...turn.streamEvents, ...events];
    const answer = latestAnswer(events);

    if (!answer) {
        const end = latestEnd(events);

        if (!end) {
            return { ...turn, streamEvents };
        }

        return { ...turn, streamEvents, end };
    }

    return {
        ...turn,
        streamEvents,
        answer: answer.content,
        startedAt: answer.startedAt,
        finishedAt: answer.finishedAt,
        domains: answer.domains,
        list: answer.list,
        persistedEvents: streamEvents.filter(shouldBePersisted).map(dropStreamOnlyIds),
    };
};

/**
 * Appends one live step onto the open turn, newest last.
 * A turn that is not stored yet is left unchanged. {@link recordTurnStreamEvent} keeps that step.
 * The conversation status changes only when this step enters or leaves a phase.
 * An answer also finishes that turn.
 * @param conversations - The stored conversations.
 * @param event - The step to append.
 * @returns The conversations, with that step on the open turn when it is already stored.
 */
const appendTurnStreamEvent = (
    conversations: Map<string, Conversation>,
    event: TurnStreamEvent
): Map<string, Conversation> => {
    const conversation = conversations.get(event.conversationId);
    const turnIndex = openTurnIndex(conversation);

    if (!conversation || turnIndex === -1) {
        return conversations;
    }

    const nextConversations = new Map(conversations);

    nextConversations.set(event.conversationId, {
        ...conversation,
        status: statusForTurnStreamEvent(event),
        turns: conversation.turns.map((turn, index) => (index === turnIndex ? applyStreamEvents(turn, [event]) : turn)),
    });

    return nextConversations;
};

/**
 * Replaces the open turn's steps with the connect snapshot, oldest first.
 * A prompt whose turn is not stored yet is skipped.
 * Each stored conversation takes its status from that prompt's phase.
 * A conversation missing from the snapshot keeps its status.
 * @param conversations - The stored conversations.
 * @param event - The connect snapshot.
 * @returns The conversations, with each stored open turn set from the snapshot.
 */
const seedTurnStreamEvents = (
    conversations: Map<string, Conversation>,
    event: AggregatedPromptsEvent
): Map<string, Conversation> => {
    if (!event.prompts.length) {
        return conversations;
    }

    const nextConversations = new Map(conversations);

    for (const prompt of event.prompts) {
        const conversation = nextConversations.get(prompt.conversationId);
        const turnIndex = openTurnIndex(conversation);

        if (!conversation || turnIndex === -1) {
            continue;
        }

        nextConversations.set(prompt.conversationId, {
            ...conversation,
            status: statusForPromptPhase(prompt.phase),
            turns: conversation.turns.map((turn, index) =>
                index === turnIndex
                    ? { ...turn, promptId: prompt.promptId, streamEvents: [...prompt.emittedEvents] }
                    : turn
            ),
        });
    }

    return nextConversations;
};

/**
 * Stable identity for a step, so a snapshot and a live copy of the same step are one step.
 * @param event - The step to identify.
 * @returns The step's fields in a stable string.
 */
const eventIdentity = (event: object): string => JSON.stringify(event);

/**
 * Keeps a live step on the open turn, or holds it on `pendingTurnEvents` until that turn is stored.
 * @param conversations - The stored conversations.
 * @param pendingTurnEvents - Steps that arrived before their turn was stored.
 * @param event - The step to keep.
 * @returns The conversations and the steps still waiting for a turn.
 */
const recordTurnStreamEvent = (
    conversations: Map<string, Conversation>,
    pendingTurnEvents: TurnStreamEvent[],
    event: TurnStreamEvent
): { conversations: Map<string, Conversation>; pendingTurnEvents: TurnStreamEvent[] } => {
    const turnIndex = openTurnIndex(conversations.get(event.conversationId));

    if (turnIndex === -1) {
        return {
            conversations,
            pendingTurnEvents: [...pendingTurnEvents, event],
        };
    }

    return {
        conversations: appendTurnStreamEvent(conversations, event),
        pendingTurnEvents,
    };
};

/**
 * Puts steps that arrived early onto the open turn, and drops them from the waiting list.
 * A conversation with no open turn keeps those steps waiting.
 * @param conversation - The conversation that may now hold the open turn.
 * @param pendingTurnEvents - Steps that arrived before their turn was stored.
 * @returns That conversation, and the steps that still have no turn.
 */
const attachPendingTurnEvents = (
    conversation: Conversation,
    pendingTurnEvents: TurnStreamEvent[]
): { conversation: Conversation; pendingTurnEvents: TurnStreamEvent[] } => {
    const matched = pendingTurnEvents.filter(event => event.conversationId === conversation.conversationId);
    const rest = pendingTurnEvents.filter(event => event.conversationId !== conversation.conversationId);
    const turnIndex = openTurnIndex(conversation);

    if (matched.length === 0 || turnIndex === -1) {
        return {
            conversation,
            pendingTurnEvents: turnIndex === -1 ? pendingTurnEvents : rest,
        };
    }

    const turn = conversation.turns[turnIndex];
    const seen = new Set(turn?.streamEvents.map(event => eventIdentity(event)));
    const fresh = matched.filter(event => !seen.has(eventIdentity(event)));

    if (fresh.length === 0 || !turn) {
        return { conversation, pendingTurnEvents: rest };
    }

    const last = fresh[fresh.length - 1];

    if (!last) {
        return { conversation, pendingTurnEvents: rest };
    }

    return {
        pendingTurnEvents: rest,
        conversation: {
            ...conversation,
            status: statusForTurnStreamEvent(last),
            turns: conversation.turns.map((existing, index) =>
                index === turnIndex ? applyStreamEvents(existing, fresh) : existing
            ),
        },
    };
};

/**
 * Remembers the latest connect snapshot on `promptEvents` and applies it to conversations already loaded.
 * Steps the snapshot now carries are dropped from the waiting list. A prompt that is not loaded stays in the snapshot.
 * @param conversations - The stored conversations.
 * @param pendingTurnEvents - Steps that arrived before their turn was stored.
 * @param event - The connect snapshot.
 * @returns The snapshot, the conversations, and the steps still waiting.
 */
const rememberPromptEvents = (
    conversations: Map<string, Conversation>,
    pendingTurnEvents: TurnStreamEvent[],
    event: AggregatedPromptsEvent
): {
    conversations: Map<string, Conversation>;
    pendingTurnEvents: TurnStreamEvent[];
    promptEvents: AggregatedPromptsEvent;
} => {
    const covered = new Map(event.prompts.map(prompt => [prompt.conversationId, prompt]));
    const nextPending = pendingTurnEvents.filter(pending => {
        const prompt = covered.get(pending.conversationId);

        if (!prompt) {
            return true;
        }

        if (
            pending.type === McpAnswerEventType.answer ||
            pending.type === McpErrorEventType.error ||
            pending.type === McpStoppedEventType.stopped
        ) {
            return true;
        }

        return !prompt.emittedEvents.some(emitted => eventIdentity(emitted) === eventIdentity(pending));
    });

    return {
        promptEvents: event,
        pendingTurnEvents: nextPending,
        conversations: seedTurnStreamEvents(conversations, event),
    };
};

/**
 * Status for a conversation just read from the server.
 * An unfinished turn uses the snapshot phase: permission, otherwise processing.
 * A read with no unfinished turn is idle. The read finishing does not by itself clear a prompt that is still open.
 * @param conversationId - The conversation that was read.
 * @param turns - The turns from that read.
 * @param snapshot - The latest connect snapshot, or none.
 * @returns The conversation to store.
 */
const conversationFromRead = (
    conversationId: string,
    turns: ConversationTurn[],
    snapshot: AggregatedPromptsEvent | null
): Conversation => {
    const draft: Conversation = {
        conversationId,
        status: 'idle',
        turns,
    };
    const turnIndex = openTurnIndex(draft);

    if (turnIndex === -1) {
        return draft;
    }

    const prompt = snapshot?.prompts.find(item => item.conversationId === conversationId);
    const status: ConversationStatus = prompt ? statusForPromptPhase(prompt.phase) : 'processing';

    return {
        conversationId,
        status,
        turns: turns.map((turn, index) =>
            index === turnIndex && prompt
                ? { ...turn, promptId: prompt.promptId, streamEvents: [...prompt.emittedEvents] }
                : turn
        ),
    };
};

const helpers = {
    removeSummary,
    removeConversation,
    setConversation,
    addConversationTurn,
    updateConversationTurn,
    setConversationStatus,
    appendTurnStreamEvent,
    seedTurnStreamEvents,
    recordTurnStreamEvent,
    attachPendingTurnEvents,
    rememberPromptEvents,
    conversationFromRead,
};

export default helpers;
