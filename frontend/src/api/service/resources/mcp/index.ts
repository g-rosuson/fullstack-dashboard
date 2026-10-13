import type { StreamOptions, StreamSubscription } from '../../client/types';
import type { McpStreamEvents } from './types';

import client from '../../client';
import config from './config';
import {
    McpConversation,
    McpConversationSummary,
    McpPermissionInput,
    McpPromptId,
    StartMcpPromptInput,
} from '@/_types/_gen';
import { ApiResponse } from '@/_types/infrastructure';

/**
 * Starts an empty conversation for the signed-in user.
 */
const create = async () => {
    return await client.post<ApiResponse<McpConversationSummary>>(config.path.conversations);
};

/**
 * Lists this user's conversations, oldest first.
 */
const list = async () => {
    return await client.get<ApiResponse<McpConversationSummary[]>>(config.path.conversations);
};

/**
 * Reads one conversation and its finished turns.
 * @param conversationId - The conversation to read.
 */
const getById = async (conversationId: string) => {
    return await client.get<ApiResponse<McpConversation>>(config.path.conversation + conversationId);
};

/**
 * Deletes one conversation and its turns.
 * @param conversationId - The conversation to delete.
 */
const deleteById = async (conversationId: string) => {
    return await client.del<ApiResponse<McpConversationSummary>>(config.path.conversation + conversationId);
};

/**
 * Starts a prompt in a conversation. `turnIds` is omitted when every finished turn should be used.
 * @param payload - Conversation id, prompt text, and optional finished-turn ids.
 */
const startPrompt = async (payload: StartMcpPromptInput) => {
    return await client.post<ApiResponse<McpPromptId>, StartMcpPromptInput>(config.path.prompt, payload);
};

/**
 * Allows the pending tool or resource on a prompt.
 * @param promptId - The prompt that is waiting.
 * @param payload - Domain, name, and kind from the open ask.
 */
const permit = async (promptId: string, payload: McpPermissionInput) => {
    const path = `${config.path.prompt}/${promptId}/permit`;
    return await client.post<ApiResponse<McpPromptId>, McpPermissionInput>(path, payload);
};

/**
 * Refuses the pending tool or resource. The prompt stays active.
 * @param promptId - The prompt that is waiting.
 * @param payload - Domain, name, and kind from the open ask.
 */
const refuse = async (promptId: string, payload: McpPermissionInput) => {
    const path = `${config.path.prompt}/${promptId}/refuse`;
    return await client.post<ApiResponse<McpPromptId>, McpPermissionInput>(path, payload);
};

/**
 * Stops a prompt that is still being answered.
 * @param promptId - The prompt to stop.
 */
const stop = async (promptId: string) => {
    const path = `${config.path.prompt}/${promptId}/stop`;
    return await client.post<ApiResponse<McpPromptId>>(path);
};

/**
 * Opens the prompt stream. Events are routed by their SSE `event` name.
 * @param options - Handlers for selecting, permission, call, answering, answer, error, and stopped.
 */
const stream = (options: StreamOptions<McpStreamEvents>): StreamSubscription => {
    return client.stream<McpStreamEvents>(config.path.stream, options);
};

const resources = {
    create,
    list,
    getById,
    deleteById,
    startPrompt,
    permit,
    refuse,
    stop,
    stream,
};

export default resources;
export type { McpStreamEvents };
