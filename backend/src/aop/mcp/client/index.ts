import { ExternalServiceException, ResourceNotFoundException, SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import { MCP_CLIENT_INFO, MCP_HEADERS, MCP_META_KEYS, MCP_METHODS, MCP_PROTOCOL_VERSION } from './constants';
import config from 'config';

import { ErrorMessage } from 'shared/enums/error-messages';

import type {
    McpClientOptions,
    McpFetch,
    McpResource,
    McpResourceReadResult,
    McpResourceTemplate,
    McpTool,
    McpToolCallResult,
} from './types';
import type { ZodType, ZodTypeDef } from 'zod';

import {
    jsonRpcErrorResponseSchema,
    jsonRpcSuccessResponseSchema,
    mcpResourceReadResultSchema,
    mcpResourcesListResultSchema,
    mcpResourceTemplatesListResultSchema,
    mcpToolCallResultSchema,
    mcpToolsListResultSchema,
} from './schemas';

const resourceKey = (domain: string, name: string): string => `${domain}\n${name}`;

const isAbortError = (error: unknown): error is Error => error instanceof Error && error.name === 'AbortError';

/**
 * Stateless JSON-RPC client for the private MCP server.
 * Copies the modern request envelope from HTTP-MCP-EXP-001.
 * `listResources` records `{ domain, name }` to URI so a later read can resolve a listed resource.
 */
export class McpClient {
    private readonly serverUrl: string;
    private readonly fetchImpl: McpFetch;
    private nextId = 1;
    private resourceUris = new Map<string, string>();

    /**
     * @param options Server URL defaults to `MCP_SERVER_URL`. `fetchImpl` replaces global fetch in tests.
     */
    constructor(options: McpClientOptions = {}) {
        this.serverUrl = options.serverUrl ?? config.mcpServerUrl;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }

    /**
     * Lists tools. Each item's domain is `_meta.domain`.
     *
     * @param signal Aborts the in-flight request
     * @returns Tools the server listed
     * @throws SchemaValidationException when the success body does not match the tool list schema
     * @throws ExternalServiceException when the server returns an error, a non-200, or the connection fails
     */
    public async listTools(signal: AbortSignal): Promise<McpTool[]> {
        const result = await this.post(MCP_METHODS.listTools, {}, signal);

        return this.parseResult(mcpToolsListResultSchema, result);
    }

    /**
     * Lists concrete resources and replaces the `{ domain, name }` to URI map.
     *
     * @param signal Aborts the in-flight request
     * @returns Resources the server listed
     * @throws SchemaValidationException when the body is invalid or two resources share a domain and name
     * @throws ExternalServiceException when the server returns an error, a non-200, or the connection fails
     */
    public async listResources(signal: AbortSignal): Promise<McpResource[]> {
        const result = await this.post(MCP_METHODS.listResources, {}, signal);
        const resources = this.parseResult(mcpResourcesListResultSchema, result);
        const uris = new Map<string, string>();

        for (const resource of resources) {
            const key = resourceKey(resource.domain, resource.name);

            if (uris.has(key)) {
                throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                    issues: [{ property: 'resources', message: 'Duplicate resource domain and name' }],
                });
            }

            uris.set(key, resource.uri);
        }

        this.resourceUris = uris;

        return resources;
    }

    /**
     * Lists resource templates. Each item's domain is `_meta.domain`.
     * Templates are not added to the concrete URI map.
     *
     * @param signal Aborts the in-flight request
     * @returns Templates the server listed
     * @throws SchemaValidationException when the success body does not match the template list schema
     * @throws ExternalServiceException when the server returns an error, a non-200, or the connection fails
     */
    public async listResourceTemplates(signal: AbortSignal): Promise<McpResourceTemplate[]> {
        const result = await this.post(MCP_METHODS.listResourceTemplates, {}, signal);

        return this.parseResult(mcpResourceTemplatesListResultSchema, result);
    }

    /**
     * Calls one tool. `result.isError` is returned to the caller and is not a server failure.
     *
     * @param name Tool name
     * @param args Tool arguments
     * @param signal Aborts the in-flight request
     * @returns The tool result
     * @throws SchemaValidationException when the success body does not match the tool result schema
     * @throws ExternalServiceException when the server returns a JSON-RPC error, a non-200, or the connection fails
     */
    public async callTool(
        name: string,
        args: Record<string, unknown>,
        signal: AbortSignal
    ): Promise<McpToolCallResult> {
        const result = await this.post(MCP_METHODS.callTool, { name, arguments: args }, signal, name);

        return this.parseResult(mcpToolCallResultSchema, result);
    }

    /**
     * Reads one resource by URI.
     *
     * @param uri Resource URI
     * @param signal Aborts the in-flight request
     * @returns The resource contents
     * @throws SchemaValidationException when the success body does not match the read schema
     * @throws ExternalServiceException when the server returns a JSON-RPC error, a non-200, or the connection fails
     */
    public async readResource(uri: string, signal: AbortSignal): Promise<McpResourceReadResult> {
        const result = await this.post(MCP_METHODS.readResource, { uri }, signal);

        return this.parseResult(mcpResourceReadResultSchema, result);
    }

    /**
     * Resolves a listed resource from the latest `listResources` result.
     *
     * @param domain Resource domain from `_meta.domain`
     * @param name Resource name
     * @returns URI to pass to `readResource`
     * @throws ResourceNotFoundException when that domain and name were not in the latest list
     */
    public resolveResourceUri(domain: string, name: string): string {
        const uri = this.resourceUris.get(resourceKey(domain, name));

        if (!uri) {
            throw new ResourceNotFoundException(ErrorMessage.MCP_RESOURCE_URI_NOT_FOUND);
        }

        return uri;
    }

    /**
     * POSTs one modern MCP request and returns the JSON-RPC result.
     * An aborted signal is rethrown so stop is not reported as a server failure.
     */
    private async post(
        method: string,
        params: Record<string, unknown>,
        signal: AbortSignal,
        mcpName?: string
    ): Promise<unknown> {
        const id = this.nextId;
        this.nextId += 1;

        const headers: Record<string, string> = {
            [MCP_HEADERS.contentType]: 'application/json',
            [MCP_HEADERS.accept]: 'application/json, text/event-stream',
            [MCP_HEADERS.protocolVersion]: MCP_PROTOCOL_VERSION,
            [MCP_HEADERS.method]: method,
        };

        if (mcpName) {
            headers[MCP_HEADERS.name] = mcpName;
        }

        const body = {
            jsonrpc: '2.0',
            id,
            method,
            params: {
                ...params,
                _meta: {
                    [MCP_META_KEYS.protocolVersion]: MCP_PROTOCOL_VERSION,
                    [MCP_META_KEYS.clientInfo]: MCP_CLIENT_INFO,
                    [MCP_META_KEYS.clientCapabilities]: {},
                },
            },
        };

        let response: Response;

        try {
            response = await this.fetchImpl(this.serverUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal,
            });
        } catch (error) {
            throw this.failureFromTransport(error);
        }

        let text: string;

        try {
            text = await response.text();
        } catch (error) {
            throw this.failureFromTransport(error);
        }

        if (response.status !== 200) {
            throw new ExternalServiceException(ErrorMessage.MCP_SERVER_REQUEST_FAILED, {
                error: new Error(`${method} failed with status ${response.status}`),
            });
        }

        const payload = this.parseJson(text);
        const errorResponse = parseSchema(jsonRpcErrorResponseSchema, payload);

        if (errorResponse.success) {
            if (errorResponse.data.id !== id) {
                throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                    issues: [{ property: 'id', message: 'MCP response id does not match the request id' }],
                });
            }

            throw new ExternalServiceException(ErrorMessage.MCP_SERVER_REQUEST_FAILED, {
                error: new Error(errorResponse.data.error.message),
            });
        }

        const successResponse = parseSchema(jsonRpcSuccessResponseSchema, payload);

        if (!successResponse.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: successResponse.issues,
            });
        }

        if (successResponse.data.id !== id) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: [{ property: 'id', message: 'MCP response id does not match the request id' }],
            });
        }

        return successResponse.data.result;
    }

    /**
     * Rethrows abort errors and wraps every other transport failure as a server failure.
     */
    private failureFromTransport(error: unknown): Error {
        if (isAbortError(error)) {
            return error;
        }

        return new ExternalServiceException(ErrorMessage.MCP_SERVER_REQUEST_FAILED, {
            error: error instanceof Error ? error : new Error(String(error)),
        });
    }

    /**
     * Parses a JSON-RPC result with the method schema.
     */
    private parseResult<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
        const result = parseSchema(schema, data);

        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: result.issues,
            });
        }

        return result.data;
    }

    /**
     * Parses a response body as JSON.
     */
    private parseJson(text: string): unknown {
        try {
            return JSON.parse(text);
        } catch {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: [{ property: 'body', message: 'MCP server response is not JSON' }],
            });
        }
    }
}
