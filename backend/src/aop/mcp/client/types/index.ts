import { z } from 'zod';

import {
    jsonRpcErrorResponseSchema,
    mcpResourceReadResultSchema,
    mcpResourcesListResultSchema,
    mcpResourceTemplatesListResultSchema,
    mcpToolCallResultSchema,
    mcpToolsListResultSchema,
} from '../schemas';

type McpTool = z.infer<typeof mcpToolsListResultSchema>[number];
type McpResource = z.infer<typeof mcpResourcesListResultSchema>[number];
type McpResourceTemplate = z.infer<typeof mcpResourceTemplatesListResultSchema>[number];
type McpToolCallResult = z.infer<typeof mcpToolCallResultSchema>;
type McpResourceReadResult = z.infer<typeof mcpResourceReadResultSchema>;
type JsonRpcErrorResponse = z.infer<typeof jsonRpcErrorResponseSchema>;

// Call-signature parameter names are not value bindings.
// eslint-disable-next-line no-unused-vars
type McpFetch = (input: string, init: RequestInit) => Promise<Response>;

type McpClientOptions = {
    serverUrl?: string;
    fetchImpl?: McpFetch;
};

export type {
    McpTool,
    McpResource,
    McpResourceTemplate,
    McpToolCallResult,
    McpResourceReadResult,
    JsonRpcErrorResponse,
    McpFetch,
    McpClientOptions,
};
