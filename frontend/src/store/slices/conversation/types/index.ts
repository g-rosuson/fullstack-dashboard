import type { AggregatedPromptsEvent, McpConversationSummary, McpStreamEvent } from '@/_types/_gen';
import type { Conversation, ConversationStatus, ConversationTurn } from '@/shared/types/conversation';

/**
 * A live prompt step. The connect snapshot is not one of these.
 */
type TurnStreamEvent = Exclude<McpStreamEvent, AggregatedPromptsEvent>;

/**
 * The store for the conversation slice.
 */
interface ConversationStore {
    summaries: McpConversationSummary[];
    conversations: Map<string, Conversation>;
    isFetchingSummaries: boolean;
}

/**
 * The slice for the conversation store.
 */
interface ConversationSlice extends ConversationStore {
    removeSummary: (conversationId: string) => void;
    setSummaries: (summaries: McpConversationSummary[]) => void;
    setSummary: (summary: McpConversationSummary) => void;
    setIsFetchingSummaries: (isFetching: boolean) => void;

    getConversation: (conversationId: string) => Conversation | undefined;
    setConversation: (conversation: Conversation) => void;
    addConversationTurn: (conversationId: string, turn: ConversationTurn) => void;
    updateConversationTurn: (conversationId: string, turn: ConversationTurn) => void;
    setConversationStatus: (conversationId: string, status: ConversationStatus) => void;

    appendTurnStreamEvent: (event: TurnStreamEvent) => void;
    seedTurnStreamEvents: (event: AggregatedPromptsEvent) => void;
    clearConversation: () => void;
}

export type { ConversationSlice, ConversationStore, Conversation, ConversationTurn, TurnStreamEvent };
