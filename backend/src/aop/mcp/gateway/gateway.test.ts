import { ExternalServiceException, SchemaValidationException } from 'aop/exceptions';

import config from 'config';

import type { ModelFetch, ModelList } from './types';

import { ModelGateway } from './index';

const apiKey = 'test-openrouter-key';
const model = 'test-model';
const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * JSON response the fake fetch resolves with.
 *
 * @param body Response body, serialized as JSON
 * @param status HTTP status. 200 when omitted
 */
const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

/**
 * Completion whose message is answer text and has no function call.
 *
 * @param content Answer text. `Done` when omitted
 */
const answerResponse = (content = 'Done'): Response =>
    jsonResponse({
        choices: [{ message: { content } }],
    });

/**
 * One tool on the MCP list.
 *
 * @param name Tool name
 * @param domain Tool domain
 * @param inputSchema Argument schema. Omitted means the tool takes no arguments
 * @param description Text the model sees for this tool
 */
const tool = (
    name: string,
    domain: string,
    inputSchema?: Record<string, unknown>,
    description?: string
): ModelList['tools'][number] => ({
    name,
    domain,
    description,
    inputSchema,
    annotations: undefined,
});

/**
 * One concrete resource on the MCP list. Its function takes no arguments.
 *
 * @param name Resource name
 * @param domain Resource domain
 * @param uri Resource URI
 * @param description Text the model sees for this resource
 */
const resource = (name: string, domain: string, uri: string, description?: string): ModelList['resources'][number] => ({
    name,
    domain,
    uri,
    description,
    mimeType: undefined,
});

/**
 * One resource template on the MCP list. Its function takes the URI template variables.
 *
 * @param name Template name
 * @param domain Template domain
 * @param uriTemplate URI template the arguments fill
 * @param description Text the model sees for this template
 */
const template = (
    name: string,
    domain: string,
    uriTemplate: string,
    description?: string
): ModelList['templates'][number] => ({
    name,
    domain,
    uriTemplate,
    description,
    mimeType: undefined,
});

describe('ModelGateway', () => {
    const signal = new AbortController().signal;

    it('[HTTP-MCP-ARG-002] sends each list item as one function', async () => {
        const domain = 'whatsapp';
        const sendName = 'send_message';
        const listName = 'list_chats';
        const resourceName = 'family';
        const templateName = 'chat';
        const uri = 'whatsapp://chats/family';
        const uriTemplate = 'whatsapp://chats/{chatId}';
        const parameters = {
            type: 'object',
            properties: {
                chat: { type: 'string' },
                text: { type: 'string' },
            },
            required: ['chat', 'text'],
            additionalProperties: false,
        };
        const noArguments = {
            type: 'object',
            properties: {},
            additionalProperties: false,
        };
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse());
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });
        const list: ModelList = {
            tools: [
                tool(sendName, domain, parameters, 'Send a message'),
                tool(listName, domain, undefined, 'List chats'),
            ],
            resources: [resource(resourceName, domain, uri, 'Family chat')],
            templates: [template(templateName, domain, uriTemplate, 'A WhatsApp chat')],
        };

        await gateway.step([{ role: 'user', content: 'Say hi' }], list, signal);

        const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
        const functions = body.tools.map(
            (entry: { function: { name: string; description: string; parameters: unknown } }) => entry.function
        );
        const send = functions.find((entry: { description: string }) =>
            entry.description.includes(`Name: ${sendName}`)
        );
        const listed = functions.find((entry: { description: string }) =>
            entry.description.includes(`Name: ${listName}`)
        );
        const concrete = functions.find((entry: { description: string }) =>
            entry.description.includes(`Name: ${resourceName}`)
        );
        const templated = functions.find((entry: { description: string }) =>
            entry.description.includes(`Name: ${templateName}`)
        );

        expect(functions).toHaveLength(4);
        expect(send.parameters).toEqual(parameters);
        expect(send.description).toContain(`Domain: ${domain}`);
        expect(listed.parameters).toEqual(noArguments);
        expect(concrete.parameters).toEqual(noArguments);
        expect(concrete.description).toContain(`URI: ${uri}`);
        expect(templated.parameters).toEqual({
            type: 'object',
            properties: { chatId: { type: 'string' } },
            required: ['chatId'],
            additionalProperties: false,
        });
        expect(templated.description).toContain(`URI template: ${uriTemplate}`);

        for (const entry of functions) {
            expect(entry.name).toMatch(/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/);
        }
    });

    it('[HTTP-MCP-SEL-002] asks the provider for at most one function', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse());
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await gateway.step(
            [{ role: 'user', content: 'Say hi' }],
            { tools: [tool('list_chats', 'whatsapp')], resources: [], templates: [] },
            signal
        );

        const [url, init] = fetchImpl.mock.calls[0];
        const headers = init?.headers as Record<string, string>;
        const body = JSON.parse(String(init?.body));

        expect(url).toBe(endpoint);
        expect(init?.method).toBe('POST');
        expect(init?.signal).toBe(signal);
        expect(headers['Content-Type']).toBe('application/json');
        expect(headers.Authorization).toBe(`Bearer ${apiKey}`);
        expect(body.model).toBe(model);
        expect(body.parallel_tool_calls).toBe(false);
        expect(body.tool_choice).toBe('auto');
    });

    it('uses the OpenRouter config when no override is passed', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse());
        const gateway = new ModelGateway({ fetchImpl });

        await gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal);

        const [url, init] = fetchImpl.mock.calls[0];
        const headers = init?.headers as Record<string, string>;
        const body = JSON.parse(String(init?.body));

        expect(url).toBe(endpoint);
        expect(headers.Authorization).toBe(`Bearer ${config.openRouterApiKey}`);
        expect(body.model).toBe(config.openRouterModel);
        expect(body.tools).toBeUndefined();
        expect(body.parallel_tool_calls).toBeUndefined();
    });

    it('[HTTP-MCP-ARG-001] returns the arguments of the selected tool', async () => {
        const domain = 'whatsapp';
        const name = 'send_message';
        const args = { chat: 'family', text: 'On my way' };
        const parameters = {
            type: 'object',
            properties: {
                chat: { type: 'string' },
                text: { type: 'string' },
            },
            required: ['chat', 'text'],
            additionalProperties: false,
        };
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            content: 'I will send that',
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: JSON.stringify(args),
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Say hi' }],
                { tools: [tool(name, domain, parameters)], resources: [], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selection',
            domain,
            name,
            kind: 'tool',
            arguments: args,
        });
    });

    it('returns a resource template with its URI variables', async () => {
        const domain = 'whatsapp';
        const name = 'chat';
        const args = { chatId: 'family' };
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: JSON.stringify(args),
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Open the family chat' }],
                { tools: [], resources: [], templates: [template(name, domain, 'whatsapp://chats/{chatId}')] },
                signal
            )
        ).resolves.toEqual({
            type: 'selection',
            domain,
            name,
            kind: 'resource',
            arguments: args,
        });
    });

    it('returns a concrete resource with no arguments', async () => {
        const domain = 'whatsapp';
        const name = 'family';
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: '{}',
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Read family' }],
                { tools: [], resources: [resource(name, domain, 'whatsapp://chats/family')], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selection',
            domain,
            name,
            kind: 'resource',
            arguments: {},
        });
    });

    it('returns answer text when the model does not call a function', async () => {
        const content = 'Nothing to send.';
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse(content));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).resolves.toEqual({
            type: 'answer',
            content,
        });
    });

    it('[FR-MCP-SEL-011] sends earlier tool and resource results with the next step', async () => {
        const prompt = 'Say hi to family';
        const previousAnswer = 'I can do that.';
        const toolContent = 'family: Family';
        const resourceContent = 'The user refused it';
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse());
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await gateway.step(
            [
                { role: 'user', content: prompt },
                { role: 'assistant', content: previousAnswer },
                { role: 'tool', content: toolContent },
                { role: 'resource', content: resourceContent },
            ],
            { tools: [], resources: [], templates: [] },
            signal
        );

        const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));

        expect(body.messages).toEqual([
            { role: 'system', content: expect.stringContaining('Call at most one function.') },
            { role: 'user', content: prompt },
            { role: 'assistant', content: previousAnswer },
            { role: 'user', content: `Tool result:\n${toolContent}` },
            { role: 'user', content: `Resource result:\n${resourceContent}` },
        ]);
    });

    it('rejects arguments that do not match the tool schema', async () => {
        const parameters = {
            type: 'object',
            properties: { chat: { type: 'string' } },
            required: ['chat'],
            additionalProperties: false,
        };
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: '{}',
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Send it' }],
                { tools: [tool('send_message', 'whatsapp', parameters)], resources: [], templates: [] },
                signal
            )
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rejects arguments on a concrete resource', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: JSON.stringify({ uri: 'whatsapp://chats/family' }),
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Read family' }],
                { tools: [], resources: [resource('family', 'whatsapp', 'whatsapp://chats/family')], templates: [] },
                signal
            )
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rejects a template call that omits a URI variable', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async (_url, init) => {
            const body = JSON.parse(String(init?.body));

            return jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                {
                                    function: {
                                        name: body.tools[0].function.name,
                                        arguments: '{}',
                                    },
                                },
                            ],
                        },
                    },
                ],
            });
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Open a chat' }],
                { tools: [], resources: [], templates: [template('chat', 'whatsapp', 'whatsapp://chats/{chatId}')] },
                signal
            )
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rejects a function that is not in the list', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () =>
            jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [{ function: { name: 'missing', arguments: '{}' } }],
                        },
                    },
                ],
            })
        );
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Say hi' }],
                { tools: [tool('list_chats', 'whatsapp')], resources: [], templates: [] },
                signal
            )
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rejects more than one function call', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () =>
            jsonResponse({
                choices: [
                    {
                        message: {
                            tool_calls: [
                                { function: { name: 'one', arguments: '{}' } },
                                { function: { name: 'two', arguments: '{}' } },
                            ],
                        },
                    },
                ],
            })
        );
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rejects a list that repeats a domain and name for one kind', async () => {
        const domain = 'whatsapp';
        const name = 'chat';
        const fetchImpl = vi.fn<ModelFetch>(async () => answerResponse());
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Open a chat' }],
                {
                    tools: [],
                    resources: [resource(name, domain, 'whatsapp://chats/chat')],
                    templates: [template(name, domain, 'whatsapp://chats/{chatId}')],
                },
                signal
            )
        ).rejects.toBeInstanceOf(SchemaValidationException);
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('[FR-MCP-FLR-002] throws ExternalServiceException for a non-200 response', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => jsonResponse({ error: { message: 'unavailable' } }, 502));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('throws ExternalServiceException when the completion is not JSON', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => new Response('nope', { status: 200 }));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('throws ExternalServiceException when the connection fails', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => {
            throw new TypeError('fetch failed');
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).rejects.toBeInstanceOf(ExternalServiceException);
    });

    it('rethrows an aborted request', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => {
            throw new DOMException('The operation was aborted', 'AbortError');
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal)
        ).rejects.toMatchObject({ name: 'AbortError' });
    });
});
