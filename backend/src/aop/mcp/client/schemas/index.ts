import { z } from 'zod';

const mcpDomainMetaSchema = z
    .object({
        domain: z.string().min(1),
    })
    .passthrough();

const mcpToolSchema = z
    .object({
        name: z.string().min(1),
        description: z.string().optional(),
        inputSchema: z.record(z.unknown()).optional(),
        annotations: z.record(z.unknown()).optional(),
        _meta: mcpDomainMetaSchema,
    })
    .transform(tool => ({
        name: tool.name,
        domain: tool._meta.domain,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
    }));

const mcpToolsListResultSchema = z
    .object({
        tools: z.array(mcpToolSchema),
    })
    .transform(result => result.tools);

const mcpResourceSchema = z
    .object({
        uri: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        mimeType: z.string().optional(),
        _meta: mcpDomainMetaSchema,
    })
    .transform(resource => ({
        name: resource.name,
        domain: resource._meta.domain,
        uri: resource.uri,
        description: resource.description,
        mimeType: resource.mimeType,
    }));

const mcpResourcesListResultSchema = z
    .object({
        resources: z.array(mcpResourceSchema),
    })
    .transform(result => result.resources);

const mcpResourceTemplateSchema = z
    .object({
        name: z.string().min(1),
        uriTemplate: z.string().min(1),
        description: z.string().optional(),
        mimeType: z.string().optional(),
        _meta: mcpDomainMetaSchema,
    })
    .transform(template => ({
        name: template.name,
        domain: template._meta.domain,
        uriTemplate: template.uriTemplate,
        description: template.description,
        mimeType: template.mimeType,
    }));

const mcpResourceTemplatesListResultSchema = z
    .object({
        resourceTemplates: z.array(mcpResourceTemplateSchema),
    })
    .transform(result => result.resourceTemplates);

const mcpContentSchema = z
    .object({
        type: z.string(),
        text: z.string().optional(),
    })
    .passthrough();

const mcpToolCallResultSchema = z
    .object({
        content: z.array(mcpContentSchema).optional(),
        isError: z.boolean().optional(),
    })
    .passthrough();

const mcpResourceReadResultSchema = z
    .object({
        contents: z.array(
            z
                .object({
                    uri: z.string(),
                    mimeType: z.string().optional(),
                    text: z.string().optional(),
                })
                .passthrough()
        ),
    })
    .passthrough();

const jsonRpcIdSchema = z.union([z.string(), z.number(), z.null()]);

const jsonRpcErrorBodySchema = z
    .object({
        code: z.number(),
        message: z.string(),
    })
    .passthrough();

const jsonRpcErrorResponseSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: jsonRpcIdSchema,
    error: jsonRpcErrorBodySchema,
});

const jsonRpcSuccessResponseSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: jsonRpcIdSchema,
    result: z.unknown(),
});

export {
    mcpToolsListResultSchema,
    mcpResourcesListResultSchema,
    mcpResourceTemplatesListResultSchema,
    mcpToolCallResultSchema,
    mcpResourceReadResultSchema,
    jsonRpcErrorResponseSchema,
    jsonRpcSuccessResponseSchema,
};
