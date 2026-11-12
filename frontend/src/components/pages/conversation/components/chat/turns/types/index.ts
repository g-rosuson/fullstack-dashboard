import type { McpPersistedPromptEvent, McpStreamEvent } from '@/_types/_gen';
import type { ConversationTurnEnd } from '@/shared/types/conversation';

interface TurnWithMessages {
    turnId: string;
    startedAt?: string;
    finishedAt?: string;
    end?: ConversationTurnEnd;
    messages: { turnId: string; prompt?: string; answer?: string }[];
    streamEvents: McpStreamEvent[];
    persistedEvents: McpPersistedPromptEvent[];
}

export type { TurnWithMessages };
