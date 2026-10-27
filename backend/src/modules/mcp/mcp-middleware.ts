import { NextFunction, Request, Response } from 'express';

import { validateRequestPayload } from 'aop/http/validators/validators-request-payload';

import { ErrorMessage } from 'shared/enums/error-messages';

import {
    createConversationInputSchema,
    idRouteParamSchema,
    permissionInputSchema,
    startPromptInputSchema,
} from './schemas';

/**
 * Validates the create-conversation body.
 * No body starts an empty conversation. `prompt` saves the opening turn.
 *
 * HTTP-MCP-CNV-001 / HTTP-MCP-CNV-008
 */
const validateCreateInput = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        createConversationInputSchema,
        req.body ?? {},
        ErrorMessage.MCP_SCHEMA_VALIDATION_FAILED
    );

    req.body = validatedPayload;

    next();
};

/**
 * Validates the start-prompt body.
 * A busy conversation, an unknown turn, and a missing conversation are decided by the runner.
 *
 * HTTP-MCP-PRG-007 — `conversationId`, `prompt`, optional `turnIds`, and optional `turnId`
 */
const validatePromptInput = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        startPromptInputSchema,
        req.body,
        ErrorMessage.MCP_SCHEMA_VALIDATION_FAILED
    );

    req.body = validatedPayload;

    next();
};

/**
 * Validates a permit or refuse body.
 * Whether that body matches the open ask is decided by the runner.
 *
 * HTTP-MCP-SEL-003 / HTTP-MCP-SEL-005 — `{ domain, name, kind }`
 */
const validatePermissionInput = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        permissionInputSchema,
        req.body,
        ErrorMessage.MCP_SCHEMA_VALIDATION_FAILED
    );

    req.body = validatedPayload;

    next();
};

/**
 * Validates the `:id` path param for a conversation or a prompt.
 * An unknown id and another user's id are the same miss, decided by the store or the runner.
 */
const validateIdParam = (req: Request, _res: Response, next: NextFunction) => {
    const validatedPayload = validateRequestPayload(
        idRouteParamSchema,
        req.params,
        ErrorMessage.MCP_SCHEMA_VALIDATION_FAILED
    );

    req.params = validatedPayload;

    next();
};

export { validateCreateInput, validateIdParam, validatePermissionInput, validatePromptInput };
