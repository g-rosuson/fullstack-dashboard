import type { Conversation, ConversationStore } from '../types';

const createConversationState = (): ConversationStore => ({
    summaries: [],
    conversations: new Map<string, Conversation>(),
    isFetchingSummaries: true,
    promptEvents: null,
    pendingTurnEvents: [],
});

const conversationState = createConversationState();

export { createConversationState };
export default conversationState;
