import config from 'config';

import { ErrorMessage } from 'shared/enums/error-messages';

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
 * A function call in a fake completion.
 * `index` is the position in the tools the gateway sent. `name` is a call that is not in that list.
 */
type FakeCall = {
    index?: number;
    name?: string;
    arguments?: Record<string, unknown>;
};

/**
 * Fetch that returns one completion calling the given functions.
 * When `content` is set, the message has answer text as well as the calls.
 *
 * @param calls Function calls, in the order the provider returns them
 * @param content Answer text sent alongside the calls
 */
const callsFetch = (calls: FakeCall[], content?: string): ModelFetch => {
    return async (_url, init) => {
        const body = JSON.parse(String(init?.body));

        return jsonResponse({
            choices: [
                {
                    message: {
                        ...(content ? { content } : {}),
                        tool_calls: calls.map(call => ({
                            function: {
                                name: call.name ?? body.tools[call.index ?? 0].function.name,
                                arguments: JSON.stringify(call.arguments ?? {}),
                            },
                        })),
                    },
                },
            ],
        });
    };
};

/**
 * Asserts the step failed as a provider failure with this detail.
 *
 * @param step The gateway step under test
 * @param detail Text on the error the gateway attached
 */
const expectProviderFailure = async (step: Promise<unknown>, detail: string): Promise<void> => {
    await expect(step).rejects.toMatchObject({
        message: ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED,
        context: {
            error: expect.objectContaining({ message: detail }),
        },
    });
};

/**
 * Asserts a function schema takes no arguments, without pinning the rest of the schema.
 *
 * @param parameters Function parameters the gateway sent
 */
const expectNoArguments = (parameters: unknown): void => {
    const schema = parameters as { properties?: Record<string, unknown>; required?: unknown };

    expect(schema.properties).toEqual({});
    expect(schema.required ?? []).toEqual([]);
};

const noMatchingCall = 'Model provider returned no function call that matches the list';

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
        expectNoArguments(listed.parameters);
        expectNoArguments(concrete.parameters);
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
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ arguments: args }], 'I will send that'));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Say hi' }],
                { tools: [tool(name, domain, parameters)], resources: [], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selections',
            items: [
                {
                    domain,
                    name,
                    kind: 'tool',
                    arguments: args,
                },
            ],
        });
    });

    it('returns a resource template with its URI variables', async () => {
        const domain = 'whatsapp';
        const name = 'chat';
        const args = { chatId: 'family' };
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ arguments: args }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Open the family chat' }],
                { tools: [], resources: [], templates: [template(name, domain, 'whatsapp://chats/{chatId}')] },
                signal
            )
        ).resolves.toEqual({
            type: 'selections',
            items: [
                {
                    domain,
                    name,
                    kind: 'resource',
                    arguments: args,
                },
            ],
        });
    });

    it('returns a concrete resource with no arguments', async () => {
        const domain = 'whatsapp';
        const name = 'family';
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{}]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'Read family' }],
                { tools: [], resources: [resource(name, domain, 'whatsapp://chats/family')], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selections',
            items: [
                {
                    domain,
                    name,
                    kind: 'resource',
                    arguments: {},
                },
            ],
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

        expect(body.messages.map((message: { role: string }) => message.role)).toEqual([
            'system',
            'user',
            'assistant',
            'user',
            'user',
        ]);
        expect(body.messages[1]).toEqual({ role: 'user', content: prompt });
        expect(body.messages[2]).toEqual({ role: 'assistant', content: previousAnswer });
        expect(body.messages[3].content).toContain(toolContent);
        expect(body.messages[4].content).toContain(resourceContent);

        const instructions = body.messages[0].content as string;

        expect(instructions).toMatch(/one function/i);
        expect(instructions).toMatch(/markdown/i);
        expect(instructions).toMatch(/answer/i);
    });

    it('rejects arguments that do not match the tool schema', async () => {
        const parameters = {
            type: 'object',
            properties: { chat: { type: 'string' } },
            required: ['chat'],
            additionalProperties: false,
        };
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{}]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step(
                [{ role: 'user', content: 'Send it' }],
                { tools: [tool('send_message', 'whatsapp', parameters)], resources: [], templates: [] },
                signal
            ),
            noMatchingCall
        );
    });

    it('rejects arguments on a concrete resource', async () => {
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ arguments: { uri: 'whatsapp://chats/family' } }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step(
                [{ role: 'user', content: 'Read family' }],
                { tools: [], resources: [resource('family', 'whatsapp', 'whatsapp://chats/family')], templates: [] },
                signal
            ),
            noMatchingCall
        );
    });

    it('rejects a template call that omits a URI variable', async () => {
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{}]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step(
                [{ role: 'user', content: 'Open a chat' }],
                { tools: [], resources: [], templates: [template('chat', 'whatsapp', 'whatsapp://chats/{chatId}')] },
                signal
            ),
            noMatchingCall
        );
    });

    it('rejects a function that is not in the list', async () => {
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ name: 'missing' }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step(
                [{ role: 'user', content: 'Say hi' }],
                { tools: [tool('list_chats', 'whatsapp')], resources: [], templates: [] },
                signal
            ),
            noMatchingCall
        );
    });

    it('[HTTP-MCP-SEL-007] returns every usable function call in order', async () => {
        const domain = 'fpl';
        const firstName = 'fpl_my_team';
        const secondName = 'fpl_gameweek';
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ index: 0 }, { index: 1 }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'How is my team' }],
                { tools: [tool(firstName, domain), tool(secondName, domain)], resources: [], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selections',
            items: [
                { domain, name: firstName, kind: 'tool', arguments: {} },
                { domain, name: secondName, kind: 'tool', arguments: {} },
            ],
        });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('[HTTP-MCP-SEL-007] keeps the usable call when another call cannot be asked', async () => {
        const domain = 'fpl';
        const name = 'fpl_my_team';
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ name: 'missing' }, { index: 0 }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expect(
            gateway.step(
                [{ role: 'user', content: 'How is my team' }],
                { tools: [tool(name, domain)], resources: [], templates: [] },
                signal
            )
        ).resolves.toEqual({
            type: 'selections',
            items: [{ domain, name, kind: 'tool', arguments: {} }],
        });
    });

    it('rejects a response where every function call is unusable', async () => {
        const fetchImpl = vi.fn<ModelFetch>(callsFetch([{ name: 'missing' }, { arguments: { extra: true } }]));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step(
                [{ role: 'user', content: 'Say hi' }],
                { tools: [tool('list_chats', 'whatsapp')], resources: [], templates: [] },
                signal
            ),
            noMatchingCall
        );
        expect(fetchImpl).toHaveBeenCalledTimes(1);
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
        ).rejects.toMatchObject({ message: ErrorMessage.SCHEMA_VALIDATION_FAILED });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('[FR-MCP-FLR-002] throws ExternalServiceException for a non-200 response', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => jsonResponse({ error: { message: 'unavailable' } }, 502));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal),
            'Chat completion failed with status 502'
        );
    });

    it('throws ExternalServiceException when the completion is not JSON', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => new Response('nope', { status: 200 }));
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal),
            'Model provider response is not JSON'
        );
    });

    it('throws ExternalServiceException when the connection fails', async () => {
        const fetchImpl = vi.fn<ModelFetch>(async () => {
            throw new TypeError('fetch failed');
        });
        const gateway = new ModelGateway({ apiKey, model, fetchImpl });

        await expectProviderFailure(
            gateway.step([{ role: 'user', content: 'Say hi' }], { tools: [], resources: [], templates: [] }, signal),
            'fetch failed'
        );
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
