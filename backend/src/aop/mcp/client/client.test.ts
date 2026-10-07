import { ExternalServiceException, ResourceNotFoundException, SchemaValidationException } from 'aop/exceptions';

import type { McpFetch } from './types';

import { McpClient } from './index';

const serverUrl = 'http://mcp-server:3000/mcp';
const protocolVersion = '2026-07-28';

const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const envelope = (method: string) => ({
    jsonrpc: '2.0',
    method,
    params: {
        _meta: {
            'io.modelcontextprotocol/protocolVersion': protocolVersion,
            'io.modelcontextprotocol/clientInfo': { name: 'backend', version: '0.0.0' },
            'io.modelcontextprotocol/clientCapabilities': {},
        },
    },
});

describe('McpClient', () => {
    const signal = new AbortController().signal;

    it('[HTTP-MCP-EXP-001] sends the modern tools/list envelope', async () => {
        const method = 'tools/list';
        const domain = 'whatsapp';
        const name = 'list_chats';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    tools: [{ name, _meta: { domain } }],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await client.listTools(signal);

        expect(fetchImpl).toHaveBeenCalledTimes(1);

        const [url, init] = fetchImpl.mock.calls[0];
        const headers = init?.headers as Record<string, string>;

        expect(url).toBe(serverUrl);
        expect(init?.method).toBe('POST');
        expect(init?.signal).toBe(signal);
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers.Accept).toBe('application/json, text/event-stream');
        expect(headers['MCP-Protocol-Version']).toBe(protocolVersion);
        expect(headers['Mcp-Method']).toBe(method);
        expect(JSON.parse(String(init?.body))).toEqual({ ...envelope(method), id: 1 });
    });

    it('maps resource domain and name to a URI', async () => {
        const domain = 'whatsapp';
        const name = 'family';
        const uri = 'whatsapp://chats/family';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    resources: [{ name, uri, _meta: { domain } }],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        const resources = await client.listResources(signal);

        expect(resources).toEqual([{ name, domain, uri, description: undefined, mimeType: undefined }]);
        expect(client.resolveResourceUri(domain, name)).toBe(uri);
    });

    it('replaces the resource URI map on the next list', async () => {
        const domain = 'whatsapp';
        const firstName = 'family';
        const secondName = 'work';
        const secondUri = 'whatsapp://chats/work';
        const fetchImpl = vi
            .fn<McpFetch>()
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: '2.0',
                    id: 1,
                    result: {
                        resources: [{ name: firstName, uri: 'whatsapp://chats/family', _meta: { domain } }],
                    },
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    jsonrpc: '2.0',
                    id: 2,
                    result: {
                        resources: [{ name: secondName, uri: secondUri, _meta: { domain } }],
                    },
                })
            );
        const client = new McpClient({ serverUrl, fetchImpl });

        await client.listResources(signal);
        await client.listResources(signal);

        expect(client.resolveResourceUri(domain, secondName)).toBe(secondUri);
        expect(() => client.resolveResourceUri(domain, firstName)).toThrow(ResourceNotFoundException);
    });

    it('rejects a resource list that repeats a domain and name', async () => {
        const domain = 'whatsapp';
        const name = 'family';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    resources: [
                        { name, uri: 'whatsapp://chats/family', _meta: { domain } },
                        { name, uri: 'whatsapp://chats/other', _meta: { domain } },
                    ],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listResources(signal)).rejects.toBeInstanceOf(SchemaValidationException);
        expect(() => client.resolveResourceUri(domain, name)).toThrow(ResourceNotFoundException);
    });

    it('reads domain from a resource template', async () => {
        const domain = 'whatsapp';
        const name = 'chat';
        const uriTemplate = 'whatsapp://chats/{chatId}';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    resourceTemplates: [{ name, uriTemplate, _meta: { domain } }],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listResourceTemplates(signal)).resolves.toEqual([
            { name, domain, uriTemplate, description: undefined, mimeType: undefined },
        ]);
    });

    it('calls a tool with Mcp-Name and returns an isError result', async () => {
        const method = 'tools/call';
        const name = 'send_message';
        const args = { chat: 'family', text: 'On my way' };
        const text = 'Chat not found: missing';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    isError: true,
                    content: [{ type: 'text', text }],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.callTool(name, args, signal)).resolves.toEqual({
            isError: true,
            content: [{ type: 'text', text }],
        });

        const init = fetchImpl.mock.calls[0][1];
        const headers = init?.headers as Record<string, string>;
        const body = JSON.parse(String(init?.body));

        expect(headers['Mcp-Method']).toBe(method);
        expect(headers['Mcp-Name']).toBe(name);
        expect(body.params.name).toBe(name);
        expect(body.params.arguments).toEqual(args);
        expect(body.params._meta['io.modelcontextprotocol/protocolVersion']).toBe(protocolVersion);
    });

    it('reads a resource by URI', async () => {
        const method = 'resources/read';
        const uri = 'whatsapp://chats/family';
        const text = '{"id":"family"}';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: {
                    contents: [{ uri, mimeType: 'application/json', text }],
                },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.readResource(uri, signal)).resolves.toEqual({
            contents: [{ uri, mimeType: 'application/json', text }],
        });

        const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));

        expect(body.method).toBe(method);
        expect(body.params.uri).toBe(uri);
    });

    it('throws ExternalServiceException for a JSON-RPC error', async () => {
        const message = 'Tool missing not found';
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                error: { code: -32602, message },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });
        const pending = client.listTools(signal);

        await expect(pending).rejects.toBeInstanceOf(ExternalServiceException);
        await expect(pending).rejects.toMatchObject({
            context: { error: expect.objectContaining({ message }) },
        });
    });

    it('throws ExternalServiceException for a non-200 response', async () => {
        const fetchImpl = vi.fn<McpFetch>(async () => jsonResponse({ jsonrpc: '2.0', id: 1, result: {} }, 500));
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listTools(signal)).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('throws ExternalServiceException when the connection fails', async () => {
        const fetchImpl = vi.fn<McpFetch>(async () => {
            throw new TypeError('fetch failed');
        });
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listTools(signal)).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rethrows an aborted request', async () => {
        const fetchImpl = vi.fn<McpFetch>(async () => {
            throw new DOMException('The operation was aborted', 'AbortError');
        });
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listTools(signal)).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('throws SchemaValidationException when a tool has no domain', async () => {
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 1,
                result: { tools: [{ name: 'list_chats' }] },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listTools(signal)).rejects.toBeInstanceOf(SchemaValidationException);
    });

    it('throws SchemaValidationException when the response id does not match', async () => {
        const fetchImpl = vi.fn<McpFetch>(async () =>
            jsonResponse({
                jsonrpc: '2.0',
                id: 9,
                result: { tools: [] },
            })
        );
        const client = new McpClient({ serverUrl, fetchImpl });

        await expect(client.listTools(signal)).rejects.toBeInstanceOf(SchemaValidationException);
    });
});
