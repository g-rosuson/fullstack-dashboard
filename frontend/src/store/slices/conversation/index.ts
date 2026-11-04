import { StateCreator } from 'zustand';

import helpers from './helpers';

import type { ConversationSlice } from './types';

import conversationState, { createConversationState } from './state';
import { Store } from '@/store/store.types';

export const createConversationSlice: StateCreator<Store, [], [], ConversationSlice> = (set, get) => ({
    ...conversationState,

    removeSummary: conversationId =>
        set(state => ({ summaries: helpers.removeSummary(conversationId, state.summaries) })),
    setSummaries: summaries => set(() => ({ summaries })),
    setSummary: summary => set(state => ({ summaries: [...state.summaries, summary] })),
    setIsFetchingSummaries: isFetchingSummaries => set(() => ({ isFetchingSummaries })),

    getConversation: conversationId => get().conversations.get(conversationId),
    setConversation: conversation =>
        set(state => {
            const attached = helpers.attachPendingTurnEvents(conversation, state.pendingTurnEvents);

            return {
                conversations: helpers.setConversation(state.conversations, attached.conversation),
                pendingTurnEvents: attached.pendingTurnEvents,
            };
        }),
    setConversationFromRead: (conversationId, turns) =>
        set(state => {
            const conversation = helpers.conversationFromRead(conversationId, turns, state.promptEvents);
            const attached = helpers.attachPendingTurnEvents(conversation, state.pendingTurnEvents);

            return {
                conversations: helpers.setConversation(state.conversations, attached.conversation),
                pendingTurnEvents: attached.pendingTurnEvents,
            };
        }),
    addConversationTurn: (conversationId, turn) =>
        set(state => {
            const withTurn = helpers.addConversationTurn(state.conversations, conversationId, turn);
            const conversation = withTurn.get(conversationId);

            if (!conversation) {
                return { conversations: withTurn };
            }

            const attached = helpers.attachPendingTurnEvents(conversation, state.pendingTurnEvents);

            return {
                conversations: helpers.setConversation(withTurn, attached.conversation),
                pendingTurnEvents: attached.pendingTurnEvents,
            };
        }),
    updateConversationTurn: (conversationId, turn) =>
        set(state => {
            const withTurn = helpers.updateConversationTurn(state.conversations, conversationId, turn);
            const conversation = withTurn.get(conversationId);

            if (!conversation) {
                return { conversations: withTurn };
            }

            const attached = helpers.attachPendingTurnEvents(conversation, state.pendingTurnEvents);

            return {
                conversations: helpers.setConversation(withTurn, attached.conversation),
                pendingTurnEvents: attached.pendingTurnEvents,
            };
        }),
    setConversationStatus: (conversationId, status) =>
        set(state => ({
            conversations: helpers.setConversationStatus(state.conversations, conversationId, status),
        })),

    appendTurnStreamEvent: event =>
        set(state => helpers.recordTurnStreamEvent(state.conversations, state.pendingTurnEvents, event)),
    seedTurnStreamEvents: event =>
        set(state => helpers.rememberPromptEvents(state.conversations, state.pendingTurnEvents, event)),

    clearConversation: () => set(() => createConversationState()),
});
