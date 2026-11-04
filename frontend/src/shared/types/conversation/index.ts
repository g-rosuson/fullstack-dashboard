import type { McpConversationTurn, McpPersistedPromptEvent, McpStreamEvent } from '@/_types/_gen';

/**
 * The status of a conversation.
 */
type ConversationStatus = 'idle' | 'processing' | 'permission' | 'error';

/**
 * A turn in the client.
 * `streamEvents` are the live prompt steps, newest last.
 * `persistedEvents` are the permission and call steps saved on the server turn.
 */
type ConversationTurn = Omit<Partial<McpConversationTurn>, 'events'> & {
    prompt: string;
    turnId: string;
    streamEvents: McpStreamEvent[];
    persistedEvents: McpPersistedPromptEvent[];
};

/**
 * An active conversation with a list of turns and a status.
 */
interface Conversation {
    conversationId: string;
    status: ConversationStatus;
    turns: ConversationTurn[];
}

export type { ConversationStatus, ConversationTurn, Conversation };
