import { useStore } from '@/store';

export const useConversationSelection = () => ({
    summaries: useStore(store => store.summaries),
    isFetchingSummaries: useStore(store => store.isFetchingSummaries),
    setSummaries: useStore(store => store.setSummaries),
    setSummary: useStore(store => store.setSummary),
    removeSummary: useStore(store => store.removeSummary),
    setIsFetchingSummaries: useStore(store => store.setIsFetchingSummaries),

    conversations: useStore(store => store.conversations),
    getConversation: useStore(store => store.getConversation),
    setConversation: useStore(store => store.setConversation),
    addConversationTurn: useStore(store => store.addConversationTurn),
    updateConversationTurn: useStore(store => store.updateConversationTurn),
    setConversationStatus: useStore(store => store.setConversationStatus),
    appendTurnStreamEvent: useStore(store => store.appendTurnStreamEvent),
    seedTurnStreamEvents: useStore(store => store.seedTurnStreamEvents),
    clearConversation: useStore(store => store.clearConversation),
});
