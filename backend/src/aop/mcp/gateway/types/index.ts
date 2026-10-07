import { z } from 'zod';

import type { McpResource, McpResourceTemplate, McpTool } from 'aop/mcp/client/types';

import { modelMessageSchema, modelStepSchema } from '../schemas';

/** One message passed into a step. */
type ModelMessage = z.infer<typeof modelMessageSchema>;

/** One step: a selection with its arguments, or the answer text. */
type ModelStep = z.infer<typeof modelStepSchema>;

/**
 * Fetch used for the provider request.
 * Tests pass a fake. Production uses global fetch.
 */
// Call-signature parameter names are not value bindings.
// eslint-disable-next-line no-unused-vars
type ModelFetch = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Construction overrides.
 * An omitted field uses config or global fetch.
 */
type ModelGatewayOptions = {
    apiKey?: string;
    model?: string;
    endpoint?: string;
    fetchImpl?: ModelFetch;
};

/** Tools, concrete resources, and resource templates the model may select on this step. */
type ModelList = {
    tools: McpTool[];
    resources: McpResource[];
    templates: McpResourceTemplate[];
};

/**
 * The list item a provider function name maps back to.
 * `parameters` is the schema those arguments must match.
 */
type CatalogEntry = {
    domain: string;
    name: string;
    kind: 'tool' | 'resource';
    parameters: Record<string, unknown>;
};

/** One function in the provider request, built from a tool, resource, or resource template. */
type ProviderTool = {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
};

export type { ModelMessage, ModelStep, ModelFetch, ModelGatewayOptions, ModelList, CatalogEntry, ProviderTool };
