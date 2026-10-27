import type { Aborter } from 'aop/aborter';
import type {
    AppendTurnPayload,
    Conversation,
    RemoveOpenTurnPayload,
} from 'aop/db/mongo/repository/conversations/types';
import type { Emitter } from 'aop/emitter';
import type { McpClient } from 'aop/mcp/client';
import type { ModelGateway } from 'aop/mcp/gateway';
import type { ModelList, ModelMessage } from 'aop/mcp/gateway/types';

import type { McpAnswerEvent, McpPersistedPromptEvent } from 'shared/types/mcp/events';

/**
 * Phases while a prompt is being answered, then the terminal outcome.
 * `selecting` covers the list fetch and each model step.
 * A prompt waiting on permission is still being answered.
 */
type PromptPhase = 'selecting' | 'permission' | 'calling' | 'saving' | 'answered' | 'stopped' | 'failed';

/**
 * One prompt still being answered, for the connect snapshot.
 * The terminal phases are absent: those prompts have left the active set.
 */
type ActivePrompt = {
    promptId: string;
    conversationId: string;
    prompt: string;
    phase: Exclude<PromptPhase, 'answered' | 'stopped' | 'failed'>;
};

/**
 * The tool or resource a permit or refuse must match.
 */
type PromptSelection = {
    domain: string;
    name: string;
    kind: 'tool' | 'resource';
};

/**
 * Fields required to start a prompt on a conversation this user owns.
 * Omit `turnIds`, or send it empty, to use every finished turn.
 */
type StartPromptInput = {
    userId: string;
    conversationId: string;
    prompt: string;
    turnIds?: string[];
    /**
     * Opening turn to complete. Required when the conversation still has that turn.
     */
    turnId?: string;
};

/**
 * How the user settled the open ask, or that stop ended it.
 */
type PermissionDecision = 'permit' | 'refuse' | 'stopped';

/**
 * The open ask. Resolving it resumes the step loop.
 */
type PendingPermission = PromptSelection & {
    arguments: Record<string, unknown>;
    // Call-signature parameter names are not value bindings.
    // eslint-disable-next-line no-unused-vars
    resolve: (decision: PermissionDecision) => void;
};

/**
 * One prompt this process still has in memory while it is being answered.
 */
type PromptRun = {
    promptId: string;
    userId: string;
    conversationId: string;
    prompt: string;
    phase: PromptPhase;
    startedAt: string;
    aborter: Aborter;
    messages: ModelMessage[];
    list?: ModelList;
    wireList?: McpAnswerEvent['list'];
    pendingPermission?: PendingPermission;
    used: PromptSelection[];
    /**
     * Permission asks and call steps, in the order they happened.
     * Saved with the turn when the answer is kept.
     */
    events: McpPersistedPromptEvent[];
    terminalEventSent: boolean;
    /**
     * Opening turn this run fills in. Absent for a later prompt, which is appended on answer.
     */
    openTurnId?: string;
};

/**
 * Owner of a prompt that has already left "being answered".
 * Kept so a later stop or permit can return 422 instead of 404.
 */
type FinishedPrompt = {
    userId: string;
};

/**
 * Conversation reads and the single append of a finished answer.
 * Stop and error do not append.
 */
type ConversationStore = {
    // Call-signature parameter names are not value bindings.
    // eslint-disable-next-line no-unused-vars
    getByIdForUser(id: string, userId: string): Promise<Conversation>;
    // Call-signature parameter names are not value bindings.
    // eslint-disable-next-line no-unused-vars
    appendTurn(payload: AppendTurnPayload): Promise<Conversation>;
    // Call-signature parameter names are not value bindings.
    // eslint-disable-next-line no-unused-vars
    completeTurn(payload: AppendTurnPayload): Promise<Conversation>;
    // Call-signature parameter names are not value bindings.
    // eslint-disable-next-line no-unused-vars
    removeOpenTurn(payload: RemoveOpenTurnPayload): Promise<void>;
};

/**
 * Dependencies for one PromptRunner.
 * `getInstance` fills these from the process. Tests pass fakes.
 */
type PromptRunnerDependencies = {
    client: Pick<
        McpClient,
        'listTools' | 'listResources' | 'listResourceTemplates' | 'callTool' | 'readResource' | 'resolveResourceUri'
    >;
    gateway: Pick<ModelGateway, 'step'>;
    emitter: Pick<Emitter, 'emit' | 'clearPromptEvents'>;
    conversations: ConversationStore;
    now?: () => Date;
    createId?: () => string;
    finishedPromptLimit?: number;
};

export type {
    ActivePrompt,
    ConversationStore,
    FinishedPrompt,
    PendingPermission,
    PermissionDecision,
    PromptPhase,
    PromptRun,
    PromptRunnerDependencies,
    PromptSelection,
    StartPromptInput,
};
