import type { McpConversationTurn, McpPersistedPromptEvent, McpStreamEvent } from '@/_types/_gen';

/**
 * The status of a conversation.
 */
type ConversationStatus = 'idle' | 'processing' | 'permission' | 'error';

/**
 * How a prompt ended when the server does not keep an answer.
 * `stopped` is a user stop. `error` is a model or server failure.
 */
type ConversationTurnEnd = 'stopped' | 'error';

/**
 * A turn in the client.
 * `streamEvents` are the live prompt steps, newest last.
 * `persistedEvents` are the permission and call steps saved on the server turn.
 * `promptId` is the live prompt. `end` is a stop or an error when the server does not keep an answer.
 */
type ConversationTurn = Omit<Partial<McpConversationTurn>, 'events'> & {
    prompt: string;
    turnId: string;
    promptId?: string;
    end?: ConversationTurnEnd;
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

export type { ConversationStatus, ConversationTurn, ConversationTurnEnd, Conversation };
