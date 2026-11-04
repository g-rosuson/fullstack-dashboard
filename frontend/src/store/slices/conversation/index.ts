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
        set(state => ({ conversations: helpers.setConversation(state.conversations, conversation) })),
    addConversationTurn: (conversationId, turn) =>
        set(state => ({
            conversations: helpers.addConversationTurn(state.conversations, conversationId, turn),
        })),
    updateConversationTurn: (conversationId, turn) =>
        set(state => ({
            conversations: helpers.updateConversationTurn(state.conversations, conversationId, turn),
        })),
    setConversationStatus: (conversationId, status) =>
        set(state => ({
            conversations: helpers.setConversationStatus(state.conversations, conversationId, status),
        })),

    appendTurnStreamEvent: event =>
        set(state => ({
            conversations: helpers.appendTurnStreamEvent(state.conversations, event),
        })),
    seedTurnStreamEvents: event =>
        set(state => ({
            conversations: helpers.seedTurnStreamEvents(state.conversations, event),
        })),

    clearConversation: () => set(() => createConversationState()),
});
