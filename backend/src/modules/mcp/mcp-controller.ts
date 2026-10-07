import { Request, Response } from 'express';

import { openSSE, sendSSE } from 'aop/http/sse';
import { PromptRunner } from 'aop/mcp/runner';

import { toConversationRead, toConversationSummary } from './mappers';
import constants from 'shared/constants';

import { HttpStatusCode } from 'shared/enums/http-status-codes';

import type { IdRouteParam, PermissionInput, StartPromptInput } from './types';
import type { McpEventTypeToPayloadMap } from 'shared/types/mcp/events';

/**
 * Opens the prompt stream for the authenticated user.
 * Replays each open permission, then forwards later prompt events for this user.
 * Closing the stream does not stop a prompt that is being answered.
 *
 * HTTP-MCP-PRG-001 — SSE headers and a prompt-event stream
 * HTTP-MCP-PRG-009 — Replay an open permission; drop listeners on close
 */
const streamMcp = (req: Request, res: Response) => {
    openSSE(res);

    const userId = req.context.user.id;

    for (const event of PromptRunner.getInstance().getOpenPermissionsForUser(userId)) {
        sendSSE(res, event);
    }

    const onSelecting = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.selecting]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.selecting, onSelecting);

    const onPermission = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.permission]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.permission, onPermission);

    const onCall = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.call]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.call, onCall);

    const onAnswering = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.answering]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.answering, onAnswering);

    const onAnswer = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.answer]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.answer, onAnswer);

    const onError = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.error]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.error, onError);

    const onStopped = (event: McpEventTypeToPayloadMap[typeof constants.events.mcp.stopped]) => {
        if (event.userId === userId) {
            sendSSE(res, event);
        }
    };
    req.context.emitter.on(constants.events.mcp.stopped, onStopped);

    req.on('close', () => {
        req.context.emitter.off(constants.events.mcp.selecting, onSelecting);
        req.context.emitter.off(constants.events.mcp.permission, onPermission);
        req.context.emitter.off(constants.events.mcp.call, onCall);
        req.context.emitter.off(constants.events.mcp.answering, onAnswering);
        req.context.emitter.off(constants.events.mcp.answer, onAnswer);
        req.context.emitter.off(constants.events.mcp.error, onError);
        req.context.emitter.off(constants.events.mcp.stopped, onStopped);
    });
};

/**
 * Starts an empty conversation for the authenticated user.
 *
 * HTTP-MCP-CNV-001 — Create returns the new conversation id
 */
const createConversation = async (req: Request, res: Response) => {
    const conversation = await req.context.db.repository.conversations.create({
        userId: req.context.user.id,
    });

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: toConversationSummary(conversation),
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Lists the conversations this user created, oldest first.
 *
 * HTTP-MCP-CNV-002 — Every id belongs to the requesting user
 */
const listConversations = async (req: Request, res: Response) => {
    const conversations = await req.context.db.repository.conversations.listForUser(req.context.user.id);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: conversations.map(toConversationSummary),
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Reads one conversation this user owns. Turns are finished answers, oldest first.
 *
 * HTTP-MCP-CNV-003 — `conversationId` equals the path id
 * HTTP-MCP-OWN-002 — A missing id and another user's id are the same miss
 *
 * @throws ResourceNotFoundException when the conversation is missing or owned by someone else
 */
const getConversation = async (req: Request<IdRouteParam>, res: Response) => {
    const conversation = await req.context.db.repository.conversations.getByIdForUser(
        req.params.id,
        req.context.user.id
    );

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: toConversationRead(conversation),
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Deletes one conversation this user owns.
 *
 * HTTP-MCP-CNV-006 — `conversationId` equals the path id
 * HTTP-MCP-OWN-002 — A missing id and another user's id are the same miss
 *
 * @throws ResourceNotFoundException when the conversation is missing or owned by someone else
 */
const deleteConversation = async (req: Request<IdRouteParam>, res: Response) => {
    const deleted = await req.context.db.repository.conversations.deleteForUser(req.params.id, req.context.user.id);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { conversationId: deleted.id },
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Starts a prompt. The step loop runs after this response, so the first event follows the 200.
 *
 * HTTP-MCP-PRG-007 — Returns `promptId` and the prompt is being answered
 * HTTP-MCP-PRG-008 — A conversation that already has a prompt being answered is unchanged
 * HTTP-MCP-OWN-002 — A missing conversation and another user's conversation are the same miss
 *
 * @throws ResourceNotFoundException when the conversation is missing or owned by someone else
 * @throws BusinessLogicException when a turn id is not a finished turn, or the conversation is busy
 */
const startPrompt = async (req: Request<unknown, unknown, StartPromptInput>, res: Response) => {
    const { promptId } = await PromptRunner.getInstance().start({
        userId: req.context.user.id,
        conversationId: req.body.conversationId,
        prompt: req.body.prompt,
        turnIds: req.body.turnIds,
    });

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { promptId },
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Allows the pending tool or resource. The `processing` event follows this response.
 *
 * HTTP-MCP-SEL-003 — `promptId` equals the path id
 * HTTP-MCP-SEL-004 — No pending ask, or a different item, leaves the prompt unchanged
 * HTTP-MCP-OWN-001 — An unknown prompt and another user's prompt are the same miss
 *
 * @throws ResourceNotFoundException when the prompt is unknown or owned by someone else
 * @throws BusinessLogicException when nothing is pending or the body is a different item
 */
const permitPrompt = async (req: Request<IdRouteParam, unknown, PermissionInput>, res: Response) => {
    PromptRunner.getInstance().permit(req.params.id, req.context.user.id, req.body);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { promptId: req.params.id },
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Refuses the pending tool or resource. The `refused` event follows this response.
 *
 * HTTP-MCP-SEL-005 — `promptId` equals the path id
 * HTTP-MCP-SEL-004 — No pending ask, or a different item, leaves the prompt unchanged
 * HTTP-MCP-OWN-001 — An unknown prompt and another user's prompt are the same miss
 *
 * @throws ResourceNotFoundException when the prompt is unknown or owned by someone else
 * @throws BusinessLogicException when nothing is pending or the body is a different item
 */
const refusePrompt = async (req: Request<IdRouteParam, unknown, PermissionInput>, res: Response) => {
    PromptRunner.getInstance().refuse(req.params.id, req.context.user.id, req.body);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { promptId: req.params.id },
        meta: { timestamp: new Date().toISOString() },
    });
};

/**
 * Stops a prompt that is being answered. The `stopped` event follows this response.
 *
 * HTTP-MCP-STP-001 — `promptId` equals the path id
 * HTTP-MCP-STP-002 — A prompt this user owns that is not being answered is rejected
 * HTTP-MCP-OWN-001 — An unknown prompt and another user's prompt are the same miss
 *
 * @throws ResourceNotFoundException when the prompt is unknown or owned by someone else
 * @throws BusinessLogicException when this user owns the prompt and it is not being answered
 */
const stopPrompt = async (req: Request<IdRouteParam>, res: Response) => {
    PromptRunner.getInstance().stop(req.params.id, req.context.user.id);

    res.status(HttpStatusCode.OK).json({
        success: true,
        data: { promptId: req.params.id },
        meta: { timestamp: new Date().toISOString() },
    });
};

export {
    createConversation,
    deleteConversation,
    getConversation,
    listConversations,
    permitPrompt,
    refusePrompt,
    startPrompt,
    stopPrompt,
    streamMcp,
};
