import type { TurnStreamEvent } from '../types';
import type { AggregatedPromptsEvent, McpConversationSummary } from '@/_types/_gen';
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
 * The open turn is the one that has not finished. A conversation holds one.
 * @param conversation - The conversation to search.
 * @returns The index of that turn, or `-1` when there is none.
 */
const openTurnIndex = (conversation: Conversation | undefined): number => {
    if (!conversation) {
        return -1;
    }

    for (let index = conversation.turns.length - 1; index >= 0; index -= 1) {
        if (!conversation.turns[index]?.finishedAt) {
            return index;
        }
    }

    return -1;
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
 * Appends one live step onto the open turn, newest last.
 * A step that arrives before that turn is stored is skipped.
 * The conversation status changes only when this step enters or leaves a phase.
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
        turns: conversation.turns.map((turn, index) =>
            index === turnIndex ? { ...turn, streamEvents: [...turn.streamEvents, event] } : turn
        ),
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
                index === turnIndex ? { ...turn, streamEvents: [...prompt.emittedEvents] } : turn
            ),
        });
    }

    return nextConversations;
};

const helpers = {
    removeSummary,
    setConversation,
    addConversationTurn,
    updateConversationTurn,
    setConversationStatus,
    appendTurnStreamEvent,
    seedTurnStreamEvents,
};

export default helpers;
