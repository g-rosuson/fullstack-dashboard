import type { AppendTurnPayload, Conversation, ConversationTurn } from 'aop/db/mongo/repository/conversations/types';
import { eventSchemas } from 'aop/emitter/schemas';
import type { EmitterEventMap, EventType } from 'aop/emitter/types';
import { BusinessLogicException, ExternalServiceException, ResourceNotFoundException } from 'aop/exceptions';
import type { McpResourceReadResult, McpToolCallResult } from 'aop/mcp/client/types';
import type { ModelList, ModelMessage, ModelStep } from 'aop/mcp/gateway/types';
import { parseSchema } from 'lib/validation';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { PromptSelection } from './types';
import type { ZodType, ZodTypeDef } from 'zod';

import { createPromptRunner } from './index';

const userId = 'user-1';
const otherUserId = 'user-2';
const conversationId = 'conversation-1';
const startedAt = '2026-04-01T00:00:00.000Z';

/**
 * Gives the step loop, which is deferred with setImmediate, time to park or finish.
 */
const drain = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise<void>(resolve => {
            setImmediate(resolve);
        });
    }
};

/**
 * The error `fetch` throws when an abort signal fires.
 * Stop is recognized by `name`, not by the message.
 *
 * @returns An `AbortError`
 */
const abortError = (): Error => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

/**
 * One tool on the MCP list.
 *
 * @param name Tool name
 * @param domain Tool domain
 * @param inputSchema Argument schema. Omitted means the tool takes no arguments
 * @returns The list item
 */
const tool = (name: string, domain: string, inputSchema?: Record<string, unknown>): ModelList['tools'][number] => ({
    name,
    domain,
    description: undefined,
    inputSchema,
    annotations: undefined,
});

/**
 * One concrete resource on the MCP list. Its function takes no arguments.
 *
 * @param name Resource name
 * @param domain Resource domain
 * @param uri Resource URI
 * @returns The list item
 */
const resource = (name: string, domain: string, uri: string): ModelList['resources'][number] => ({
    name,
    domain,
    uri,
    description: undefined,
    mimeType: undefined,
});

/**
 * One resource template on the MCP list. Its function takes the URI template variables.
 *
 * @param name Template name
 * @param domain Template domain
 * @param uriTemplate URI template the arguments fill
 * @returns The list item
 */
const template = (name: string, domain: string, uriTemplate: string): ModelList['templates'][number] => ({
    name,
    domain,
    uriTemplate,
    description: undefined,
    mimeType: undefined,
});

/**
 * A model step that selects one tool or resource and fills its arguments.
 *
 * @param name Item name
 * @param domain Item domain
 * @param kind `tool` or `resource`. A resource template is `resource`
 * @param args Arguments for that step. Empty when omitted
 * @returns The step
 */
const selection = (
    name: string,
    domain: string,
    kind: PromptSelection['kind'],
    args: Record<string, unknown> = {}
): ModelStep => ({
    type: 'selection',
    domain,
    name,
    kind,
    arguments: args,
});

/**
 * A model step that writes the answer and does not select a tool or resource.
 *
 * @param content Answer text
 * @returns The step
 */
const answer = (content: string): ModelStep => ({ type: 'answer', content });

type HarnessOptions = {
    turns?: ConversationTurn[];
    list?: ModelList;
    pauseTools?: boolean;
    finishedPromptLimit?: number;
    appendError?: Error;
};

/**
 * A runner whose model, MCP server, and conversation store are in memory.
 * Each `step` consumes one scripted result, or parks until stop aborts it.
 *
 * @param options Finished turns, the MCP list, and whether tool calls wait for stop
 * @returns The runner and the events, calls, and saves it recorded
 */
const createHarness = (options: HarnessOptions = {}) => {
    const events: EmitterEventMap[EventType][] = [];
    const steps: Array<ModelStep | Error> = [];
    const seenMessages: ModelMessage[][] = [];
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const resourceReads: string[] = [];
    const appended: AppendTurnPayload[] = [];
    const list = options.list ?? { tools: [], resources: [], templates: [] };
    let appendError = options.appendError;
    let ids = 0;
    let toolResult: McpToolCallResult = { content: [{ type: 'text', text: 'tool text' }] };
    let resourceResult: McpResourceReadResult = { contents: [{ uri: 'whatsapp://inbox', text: 'resource text' }] };
    let listFailure: Error | undefined;
    let toolFailure: Error | undefined;
    // The parameter name is the resolver's argument, not a value binding.
    // eslint-disable-next-line no-unused-vars
    const resolvers: Array<(result: McpToolCallResult) => void> = [];

    const emit = (event: EmitterEventMap[EventType]) => {
        const schema = eventSchemas[event.type] as unknown as ZodType<EmitterEventMap[EventType], ZodTypeDef, unknown>;
        const parsed = parseSchema(schema, event);

        if (!parsed.success) {
            throw new Error(`Invalid ${event.type} event: ${JSON.stringify(parsed.issues)}`);
        }

        events.push(parsed.data);
    };

    const client = {
        listTools: async () => {
            if (listFailure) {
                throw listFailure;
            }

            return list.tools;
        },
        listResources: async () => list.resources,
        listResourceTemplates: async () => list.templates,
        callTool: (name: string, args: Record<string, unknown>, signal: AbortSignal) =>
            new Promise<McpToolCallResult>((resolve, reject) => {
                toolCalls.push({ name, args: { ...args } });

                if (signal.aborted) {
                    reject(abortError());

                    return;
                }

                if (toolFailure) {
                    reject(toolFailure);

                    return;
                }

                if (!options.pauseTools) {
                    resolve(toolResult);

                    return;
                }

                signal.addEventListener('abort', () => reject(abortError()), { once: true });
                resolvers.push(resolve);
            }),
        readResource: async (uri: string) => {
            resourceReads.push(uri);

            return resourceResult;
        },
        resolveResourceUri: (domain: string, name: string) => {
            const match = list.resources.find(item => item.domain === domain && item.name === name);

            if (!match) {
                throw new ResourceNotFoundException(ErrorMessage.MCP_RESOURCE_URI_NOT_FOUND);
            }

            return match.uri;
        },
    };

    const gateway = {
        step: (messages: ModelMessage[], _list: ModelList, signal: AbortSignal) =>
            new Promise<ModelStep>((resolve, reject) => {
                seenMessages.push(messages.map(message => ({ ...message })));

                if (signal.aborted) {
                    reject(abortError());

                    return;
                }

                const next = steps.shift();

                if (!next) {
                    signal.addEventListener('abort', () => reject(abortError()), { once: true });

                    return;
                }

                if (next instanceof Error) {
                    reject(next);

                    return;
                }

                resolve(next);
            }),
    };

    const turns = options.turns ?? [];
    const conversation: Conversation = {
        id: conversationId,
        userId,
        turns: turns.map(turn => ({ ...turn })),
    };

    const conversations = {
        getByIdForUser: async (id: string, ownerId: string) => {
            if (id !== conversationId || ownerId !== userId) {
                throw new ResourceNotFoundException(ErrorMessage.CONVERSATION_NOT_FOUND);
            }

            return {
                ...conversation,
                turns: conversation.turns.map(turn => ({ ...turn })),
            };
        },
        appendTurn: async (payload: AppendTurnPayload) => {
            if (appendError) {
                throw appendError;
            }

            appended.push(payload);
            conversation.turns = [...conversation.turns, payload.turn];

            return {
                ...conversation,
                turns: conversation.turns.map(turn => ({ ...turn })),
            };
        },
    };

    const runner = createPromptRunner({
        client,
        gateway,
        emitter: { emit },
        conversations,
        now: () => new Date(startedAt),
        createId: () => {
            ids += 1;

            return `id-${ids}`;
        },
        finishedPromptLimit: options.finishedPromptLimit,
    });

    return {
        runner,
        events,
        steps,
        seenMessages,
        toolCalls,
        resourceReads,
        appended,
        conversation,
        releaseTool: () => {
            const resolve = resolvers.shift();

            resolve?.(toolResult);
        },
        setToolResult: (result: McpToolCallResult) => {
            toolResult = result;
        },
        setResourceResult: (result: McpResourceReadResult) => {
            resourceResult = result;
        },
        failList: (error: Error) => {
            listFailure = error;
        },
        failTool: (error: Error) => {
            toolFailure = error;
        },
        allowAppend: () => {
            appendError = undefined;
        },
    };
};

/**
 * Event types in stream order. A `call` is `call:` plus its status, so `processing` and `failed` stay distinct.
 *
 * @param events Events the runner emitted
 * @returns One label per event
 */
const eventNames = (events: EmitterEventMap[EventType][]): string[] =>
    events.map(event => (event.type === 'call' ? `call:${event.status}` : event.type));

describe('PromptRunner', () => {
    it('[HTTP-MCP-CTX-002] sends every finished turn, then the new prompt', async () => {
        const firstPrompt = 'first prompt';
        const firstAnswer = 'first answer';
        const secondPrompt = 'second prompt';
        const secondAnswer = 'second answer';
        const prompt = 'new prompt';
        const content = 'done';
        const harness = createHarness({
            turns: [
                { turnId: 't1', prompt: firstPrompt, answer: firstAnswer, savedAt: startedAt },
                { turnId: 't2', prompt: secondPrompt, answer: secondAnswer, savedAt: startedAt },
            ],
        });

        harness.steps.push(answer(content));

        const started = await harness.runner.start({ userId, conversationId, prompt });

        await drain();

        expect(started.promptId).toBe('id-1');
        expect(harness.seenMessages[0]).toEqual([
            { role: 'user', content: firstPrompt },
            { role: 'assistant', content: firstAnswer },
            { role: 'user', content: secondPrompt },
            { role: 'assistant', content: secondAnswer },
            { role: 'user', content: prompt },
        ]);
        expect(eventNames(harness.events)).toEqual(['selecting', 'answering', 'answer']);
        expect(harness.appended).toHaveLength(1);
        expect(harness.appended[0]?.turn.answer).toBe(content);
    });

    it('[HTTP-MCP-CTX-001] sends only the selected turns, in saved order', async () => {
        const olderPrompt = 'older';
        const olderAnswer = 'old answer';
        const newerPrompt = 'newer';
        const newerAnswer = 'new answer';
        const prompt = 'follow up';
        const harness = createHarness({
            turns: [
                { turnId: 'older', prompt: olderPrompt, answer: olderAnswer, savedAt: startedAt },
                { turnId: 'newer', prompt: newerPrompt, answer: newerAnswer, savedAt: startedAt },
            ],
        });

        harness.steps.push(answer('ok'));

        await harness.runner.start({
            userId,
            conversationId,
            prompt,
            turnIds: ['newer', 'older'],
        });
        await drain();

        expect(harness.seenMessages[0]).toEqual([
            { role: 'user', content: olderPrompt },
            { role: 'assistant', content: olderAnswer },
            { role: 'user', content: newerPrompt },
            { role: 'assistant', content: newerAnswer },
            { role: 'user', content: prompt },
        ]);
    });

    it('[HTTP-MCP-CTX-003] rejects a turn id that is not a finished turn and does not reserve the conversation', async () => {
        const harness = createHarness({
            turns: [{ turnId: 'saved', prompt: 'p', answer: 'a', savedAt: startedAt }],
        });

        await expect(
            harness.runner.start({ userId, conversationId, prompt: 'next', turnIds: ['missing'] })
        ).rejects.toMatchObject({ message: ErrorMessage.MCP_TURN_NOT_IN_CONVERSATION });

        expect(harness.events).toEqual([]);
        expect(harness.conversation.turns).toHaveLength(1);

        harness.steps.push(answer('ok'));

        const started = await harness.runner.start({ userId, conversationId, prompt: 'next' });

        expect(started.promptId).toBe('id-1');
    });

    it('[HTTP-MCP-CTX-003] rejects a repeated turn id and does not reserve the conversation', async () => {
        const harness = createHarness({
            turns: [{ turnId: 'saved', prompt: 'p', answer: 'a', savedAt: startedAt }],
        });

        await expect(
            harness.runner.start({ userId, conversationId, prompt: 'next', turnIds: ['saved', 'saved'] })
        ).rejects.toMatchObject({ message: ErrorMessage.MCP_TURN_NOT_IN_CONVERSATION });

        expect(harness.events).toEqual([]);
        expect(harness.conversation.turns).toHaveLength(1);

        harness.steps.push(answer('ok'));

        const started = await harness.runner.start({ userId, conversationId, prompt: 'next' });

        expect(started.promptId).toBe('id-1');
    });

    it('[HTTP-MCP-PRG-008] rejects a second prompt while one is being answered, including on permission', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.steps.push(selection(name, domain, 'tool', { text: 'hi' }));

        await harness.runner.start({ userId, conversationId, prompt: 'send it' });
        await drain();

        await expect(harness.runner.start({ userId, conversationId, prompt: 'again' })).rejects.toMatchObject({
            message: ErrorMessage.MCP_CONVERSATION_BUSY,
        });

        harness.runner.permit('id-1', userId, { domain, name, kind: 'tool' });
        harness.steps.push(answer('sent'));
        await drain();

        const next = await harness.runner.start({ userId, conversationId, prompt: 'again' });

        expect(next.promptId).toBe('id-3');
    });

    it('[HTTP-MCP-SEL-001] asks with the arguments, and the call carries those same arguments', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const args = { text: 'hello' };
        const harness = createHarness({
            list: {
                tools: [
                    tool(name, domain, {
                        type: 'object',
                        properties: { text: { type: 'string' } },
                        required: ['text'],
                    }),
                ],
                resources: [],
                templates: [],
            },
        });

        harness.steps.push(selection(name, domain, 'tool', args), answer('sent'));

        await harness.runner.start({ userId, conversationId, prompt: 'say hello' });
        await drain();

        const permission = harness.events.find(event => event.type === 'permission');

        expect(permission).toMatchObject({ domain, name, kind: 'tool', arguments: args });
        expect(harness.runner.getOpenPermissionsForUser(userId)).toEqual([permission]);

        harness.runner.permit('id-1', userId, { domain, name, kind: 'tool' });
        await drain();

        expect(harness.toolCalls[0]).toEqual({ name, args });
        expect(harness.events.find(event => event.type === 'call' && event.status === 'processing')).toMatchObject({
            arguments: args,
        });
        expect(harness.runner.getOpenPermissionsForUser(userId)).toEqual([]);

        const finished = harness.events.find(event => event.type === 'answer');

        expect(finished).toMatchObject({
            content: 'sent',
            startedAt,
            finishedAt: startedAt,
            list: {
                tools: [{ domain, name, argumentFields: [{ name: 'text', type: 'string', required: true }] }],
                resources: [],
            },
            domains: [{ name: domain, tools: [{ name }], resources: [] }],
        });
    });

    it('[HTTP-MCP-ARG-001] builds the next arguments from the earlier result', async () => {
        const domain = 'whatsapp';
        const firstName = 'search';
        const secondName = 'send';
        const firstArgs = { query: 'ada' };
        const secondArgs = { text: 'ada@example.com' };
        const harness = createHarness({
            list: { tools: [tool(firstName, domain), tool(secondName, domain)], resources: [], templates: [] },
        });

        harness.setToolResult({ content: [{ type: 'text', text: 'ada@example.com' }] });
        harness.steps.push(
            selection(firstName, domain, 'tool', firstArgs),
            selection(secondName, domain, 'tool', secondArgs),
            answer('done')
        );

        await harness.runner.start({ userId, conversationId, prompt: 'find ada and send' });
        await drain();
        harness.runner.permit('id-1', userId, { domain, name: firstName, kind: 'tool' });
        await drain();

        expect(harness.seenMessages[1]).toContainEqual({ role: 'tool', content: 'ada@example.com' });

        harness.runner.permit('id-1', userId, { domain, name: secondName, kind: 'tool' });
        await drain();

        expect(harness.toolCalls[1]?.args).toEqual(secondArgs);
    });

    it('[HTTP-MCP-SEL-005] records a refusal and continues without listing it as used', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.steps.push(selection(name, domain, 'tool', { text: 'no' }), answer('skipped'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();
        harness.runner.refuse('id-1', userId, { domain, name, kind: 'tool' });
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'permission', 'call:refused', 'answering', 'answer']);
        expect(harness.toolCalls).toHaveLength(0);

        const finished = harness.events.find(event => event.type === 'answer');

        expect(finished).toMatchObject({
            domains: [],
            messages: [
                { role: 'user', content: 'send' },
                { role: 'tool', content: 'The user refused this tool.' },
            ],
        });
    });

    it('[HTTP-MCP-SEL-004] rejects a permit that is not the pending ask', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.steps.push(selection(name, domain, 'tool'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();

        expect(() => harness.runner.permit('id-1', userId, { domain, name: 'other', kind: 'tool' })).toThrow(
            BusinessLogicException
        );
        expect(harness.runner.getOpenPermissionsForUser(userId)).toHaveLength(1);

        harness.runner.stop('id-1', userId);
        await drain();
    });

    it('[HTTP-MCP-FLR-001] continues after a tool reports failure and still lists it as used', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.setToolResult({ content: [{ type: 'text', text: 'nope' }], isError: true });
        harness.steps.push(selection(name, domain, 'tool'), answer('continued'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();
        harness.runner.permit('id-1', userId, { domain, name, kind: 'tool' });
        await drain();

        expect(eventNames(harness.events)).toEqual([
            'selecting',
            'permission',
            'call:processing',
            'call:failed',
            'answering',
            'answer',
        ]);

        const finished = harness.events.find(event => event.type === 'answer');

        expect(finished).toMatchObject({
            domains: [{ name: domain, tools: [{ name }], resources: [] }],
            messages: expect.arrayContaining([{ role: 'tool', content: 'nope' }]),
        });
        expect(harness.appended).toHaveLength(1);
    });

    it('[HTTP-MCP-FLR-002] ends on a provider failure and leaves the conversation unchanged', async () => {
        const harness = createHarness();

        harness.steps.push(
            new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
                error: new Error('Chat completion failed with status 500'),
            })
        );

        await harness.runner.start({ userId, conversationId, prompt: 'hi' });
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'error']);
        expect(harness.events.find(event => event.type === 'error')).toMatchObject({
            context: 'Chat completion failed with status 500',
            list: { tools: [], resources: [] },
        });
        expect(harness.appended).toHaveLength(0);

        harness.steps.push(answer('later'));

        await expect(harness.runner.start({ userId, conversationId, prompt: 'again' })).resolves.toMatchObject({
            promptId: 'id-2',
        });
        await drain();
    });

    it('[HTTP-MCP-FLR-002] ends on a server failure while a call is in flight', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({
            list: { tools: [tool(name, domain)], resources: [], templates: [] },
        });

        harness.steps.push(selection(name, domain, 'tool'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();
        harness.failTool(
            new ExternalServiceException(ErrorMessage.MCP_SERVER_REQUEST_FAILED, {
                error: new Error('tools/call failed with status 500'),
            })
        );
        harness.runner.permit('id-1', userId, { domain, name, kind: 'tool' });
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'permission', 'call:processing', 'error']);
        expect(harness.events.find(event => event.type === 'error')).toMatchObject({
            context: 'tools/call failed with status 500',
        });
        expect(harness.appended).toHaveLength(0);
    });

    it('[HTTP-MCP-FLR-003] ends with error when the finished answer cannot be kept', async () => {
        const prompt = 'save me';
        const harness = createHarness({ appendError: new Error('save failed') });

        harness.steps.push(answer('unsaved'));

        await harness.runner.start({ userId, conversationId, prompt });
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'error']);
        expect(harness.events.find(event => event.type === 'error')).toMatchObject({
            context: 'save failed',
            messages: [{ role: 'user', content: prompt }],
            list: { tools: [], resources: [] },
        });
        expect(harness.events.some(event => event.type === 'answer')).toBe(false);
        expect(harness.appended).toHaveLength(0);
        expect(harness.conversation.turns).toHaveLength(0);

        harness.allowAppend();
        harness.steps.push(answer('later'));

        await expect(harness.runner.start({ userId, conversationId, prompt: 'again' })).resolves.toEqual({
            promptId: expect.any(String),
        });
        await drain();

        expect(harness.appended).toHaveLength(1);
        expect(harness.appended[0]?.turn.answer).toBe('later');
    });

    it('[HTTP-MCP-STP-001] stops an open ask and does not run the tool', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.steps.push(selection(name, domain, 'tool', { text: 'hi' }));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();
        harness.runner.stop('id-1', userId);
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'permission', 'stopped']);
        expect(harness.toolCalls).toHaveLength(0);
        expect(harness.appended).toHaveLength(0);
        expect(harness.events.find(event => event.type === 'stopped')).toMatchObject({
            messages: [{ role: 'user', content: 'send' }],
            list: { tools: [{ domain, name, argumentFields: [] }], resources: [] },
        });
    });

    it('[HTTP-MCP-STP-001] cancels an in-flight call and does not report it succeeded or failed', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({
            list: { tools: [tool(name, domain)], resources: [], templates: [] },
            pauseTools: true,
        });

        harness.steps.push(selection(name, domain, 'tool'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();
        harness.runner.permit('id-1', userId, { domain, name, kind: 'tool' });
        await drain();
        harness.runner.stop('id-1', userId);
        await drain();

        expect(eventNames(harness.events)).toEqual(['selecting', 'permission', 'call:processing', 'stopped']);
    });

    it('[HTTP-MCP-STP-002] rejects a stop after the prompt has answered', async () => {
        const harness = createHarness();

        harness.steps.push(answer('done'));

        await harness.runner.start({ userId, conversationId, prompt: 'hi' });
        await drain();

        expect(() => harness.runner.stop('id-1', userId)).toThrow(BusinessLogicException);
        expect(() => harness.runner.permit('id-1', userId, { domain: 'whatsapp', name: 'send', kind: 'tool' })).toThrow(
            BusinessLogicException
        );
    });

    it('[HTTP-MCP-OWN-001] hides another user and an unknown id', async () => {
        const domain = 'whatsapp';
        const name = 'send';
        const harness = createHarness({ list: { tools: [tool(name, domain)], resources: [], templates: [] } });

        harness.steps.push(selection(name, domain, 'tool'));

        await harness.runner.start({ userId, conversationId, prompt: 'send' });
        await drain();

        expect(() => harness.runner.permit('id-1', otherUserId, { domain, name, kind: 'tool' })).toThrow(
            ResourceNotFoundException
        );
        expect(() => harness.runner.stop('missing', userId)).toThrow(ResourceNotFoundException);
        expect(harness.runner.getOpenPermissionsForUser(userId)).toHaveLength(1);

        await expect(harness.runner.start({ userId: otherUserId, conversationId, prompt: 'nope' })).rejects.toThrow(
            ResourceNotFoundException
        );

        harness.runner.stop('id-1', userId);
        await drain();
    });

    it('forgets a finished prompt once the memory cap drops it', async () => {
        const harness = createHarness({ finishedPromptLimit: 1 });

        harness.steps.push(answer('one'));
        await harness.runner.start({ userId, conversationId, prompt: 'first' });
        await drain();

        harness.steps.push(answer('two'));
        await harness.runner.start({ userId, conversationId, prompt: 'second' });
        await drain();

        expect(() => harness.runner.stop('id-1', userId)).toThrow(ResourceNotFoundException);
        expect(() => harness.runner.stop('id-3', userId)).toThrow(BusinessLogicException);
    });

    it('reads a concrete resource by the URI from the list', async () => {
        const domain = 'whatsapp';
        const name = 'inbox';
        const uri = 'whatsapp://inbox';
        const harness = createHarness({
            list: { tools: [], resources: [resource(name, domain, uri)], templates: [] },
        });

        harness.steps.push(selection(name, domain, 'resource'), answer('read'));

        await harness.runner.start({ userId, conversationId, prompt: 'open the inbox' });
        await drain();
        harness.runner.permit('id-1', userId, { domain, name, kind: 'resource' });
        await drain();

        expect(harness.resourceReads).toEqual([uri]);
    });

    it('[HTTP-MCP-ARG-002] reads a resource template with the arguments filled in', async () => {
        const domain = 'whatsapp';
        const name = 'chat';
        const uriTemplate = 'whatsapp://chats/{chatId}';
        const harness = createHarness({
            list: { tools: [], resources: [], templates: [template(name, domain, uriTemplate)] },
        });

        harness.steps.push(selection(name, domain, 'resource', { chatId: '42' }), answer('read'));

        await harness.runner.start({ userId, conversationId, prompt: 'open the chat' });
        await drain();
        harness.runner.permit('id-1', userId, { domain, name, kind: 'resource' });
        await drain();

        expect(harness.resourceReads).toEqual(['whatsapp://chats/42']);

        const finished = harness.events.find(event => event.type === 'answer');

        expect(finished).toMatchObject({
            list: { resources: [{ domain, name, uriTemplate }] },
            domains: [{ name: domain, tools: [], resources: [{ name }] }],
            messages: expect.arrayContaining([{ role: 'resource', content: 'resource text' }]),
        });
    });

    it('omits the list when the server fails before the list arrives', async () => {
        const harness = createHarness();

        harness.failList(
            new ExternalServiceException(ErrorMessage.MCP_SERVER_REQUEST_FAILED, {
                error: new Error('MCP list failed'),
            })
        );

        await harness.runner.start({ userId, conversationId, prompt: 'hi' });
        await drain();

        const errorEvent = harness.events.find(event => event.type === 'error');

        expect(errorEvent).toMatchObject({ context: 'MCP list failed' });
        expect(errorEvent && 'list' in errorEvent).toBe(false);
    });
});
