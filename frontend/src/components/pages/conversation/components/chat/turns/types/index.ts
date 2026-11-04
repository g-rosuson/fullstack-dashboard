import type { McpPersistedPromptEvent, McpStreamEvent } from '@/_types/_gen';

interface TurnWithMessages {
    turnId: string;
    messages: { turnId: string; prompt?: string; answer?: string }[];
    streamEvents: McpStreamEvent[];
    persistedEvents: McpPersistedPromptEvent[];
}

export type { TurnWithMessages };
