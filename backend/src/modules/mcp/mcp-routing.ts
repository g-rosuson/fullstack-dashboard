import { Router } from 'express';

import { forwardSyncError } from 'aop/http/middleware/sync';

import {
    createConversation,
    deleteConversation,
    getConversation,
    listConversations,
    permitPrompt,
    refusePrompt,
    startPrompt,
    stopPrompt,
    streamMcp,
} from './mcp-controller';
import { validateIdParam, validatePermissionInput, validatePromptInput } from './mcp-middleware';

import constants from 'shared/constants';

const router = Router();

router.get(constants.routes.mcp.stream, forwardSyncError(streamMcp));

router.post(constants.routes.mcp.createConversation, createConversation);
router.get(constants.routes.mcp.listConversations, listConversations);
router.get(constants.routes.mcp.getConversation, forwardSyncError(validateIdParam), getConversation);
router.delete(constants.routes.mcp.deleteConversation, forwardSyncError(validateIdParam), deleteConversation);

router.post(constants.routes.mcp.startPrompt, forwardSyncError(validatePromptInput), startPrompt);
router.post(
    constants.routes.mcp.permitPrompt,
    forwardSyncError(validateIdParam),
    forwardSyncError(validatePermissionInput),
    permitPrompt
);
router.post(
    constants.routes.mcp.refusePrompt,
    forwardSyncError(validateIdParam),
    forwardSyncError(validatePermissionInput),
    refusePrompt
);
router.post(constants.routes.mcp.stopPrompt, forwardSyncError(validateIdParam), stopPrompt);

export default router;
