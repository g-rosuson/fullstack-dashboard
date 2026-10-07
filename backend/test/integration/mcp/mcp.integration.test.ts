import { ErrorCode } from 'aop/exceptions/shared/enums';

import { mapToRegisterPayload } from '../auth/mappers';
import constants from 'shared/constants';

import type { McpStream, McpStreamEvent } from './sse';
import type { Express } from 'express';

import { clearCollections, deleteCronJobs, disconnectMongo, getAgent, initServer } from '../harness';
import { expectErrorEnvelope, expectIso8601UtcTimestamp, expectSuccessEnvelope } from '../helpers/expect';
import { installRemoteFetch, releaseHungCalls, settleRemote, useRemote } from './remote';
import { openMcpStream } from './sse';

/**
 * Integration: MCP HTTP — real Express, Mongo, and prompt runner.
 * The model provider and the MCP server are scripted stand-ins on fetch.
 *
 * Cites docs/specs/architecture/http/mcp (`HTTP-MCP-*`).
 * Auth gate: docs/specs/architecture/http/auth/session.md (`HTTP-AUTH-TOK-003`).
 */

const domain = 'whatsapp';
const events = constants.events.mcp;

const textSchema = {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: false,
};

const sendTool = { name: 'send', domain, inputSchema: textSchema };
const lookupTool = { name: 'lookup', domain, inputSchema: textSchema };
const inboxResource = { name: 'inbox', domain, uri: 'whatsapp://inbox' };
const chatTemplate = { name: 'chat', domain, uriTemplate: 'whatsapp://chats/{chatId}' };

const sendSelection = { domain, name: 'send', kind: 'tool' as const };

type Turn = { turnId: string; prompt: string; answer: string };

/**
 * Fills the `:id` segment of a route constant.
 *
 * @param path Route with an `:id` segment
 * @param id Conversation or prompt id
 * @returns The path supertest can request
 */
const withId = (path: string, id: string): string => path.replace(':id', id);

/**
 * Event names in arrival order. A call is `call:` plus its status.
 *
 * @param streamEvents Events read from the prompt stream
 * @returns One label per event
 */
const labels = (streamEvents: McpStreamEvent[]): string[] =>
    streamEvents.map(event => (event.event === events.call ? `call:${String(event.data.status)}` : event.event));

describe('Integration: MCP HTTP', () => {
    let app: Express;
    let agent: ReturnType<typeof getAgent>;
    let emailSeq = 0;

    /**
     * Registers a new user.
     *
     * @returns That user's access token
     */
    const registerUser = async (): Promise<string> => {
        emailSeq += 1;
        const response = await agent
            .post(constants.routes.auth.register)
            .send(mapToRegisterPayload(`mcp-${emailSeq}@example.com`));

        expect(response.status).toBe(200);

        return response.body.data as string;
    };

    /**
     * Creates an empty conversation for this user.
     *
     * @param token Access token
     * @returns The new conversation id
     */
    const createConversation = async (token: string): Promise<string> => {
        const response = await agent
            .post(constants.routes.mcp.createConversation)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expectSuccessEnvelope(response.body);

        return response.body.data.conversationId as string;
    };

    /**
     * Reads one conversation.
     *
     * @param token Access token
     * @param conversationId Conversation to read
     * @returns The HTTP response
     */
    const readConversation = (token: string, conversationId: string) =>
        agent.get(withId(constants.routes.mcp.getConversation, conversationId)).set('Authorization', `Bearer ${token}`);

    /**
     * Starts a prompt. `turnIds` is omitted from the body when the caller leaves it out.
     *
     * @param token Access token
     * @param conversationId Conversation the prompt runs in
     * @param prompt Prompt text
     * @param turnIds Finished turns to send. Omit for every turn. An empty array is sent as empty
     * @returns The HTTP response
     */
    const startPrompt = (token: string, conversationId: string, prompt: string, turnIds?: string[]) => {
        const body: { conversationId: string; prompt: string; turnIds?: string[] } = { conversationId, prompt };

        if (turnIds !== undefined) {
            body.turnIds = turnIds;
        }

        return agent.post(constants.routes.mcp.startPrompt).set('Authorization', `Bearer ${token}`).send(body);
    };

    /**
     * Allows the pending tool or resource.
     *
     * @param token Access token
     * @param promptId Prompt that asked
     * @param body Domain, name, and kind from the permission event
     * @returns The HTTP response
     */
    const permit = (
        token: string,
        promptId: string,
        body: { domain: string; name: string; kind: 'tool' | 'resource' }
    ) =>
        agent
            .post(withId(constants.routes.mcp.permitPrompt, promptId))
            .set('Authorization', `Bearer ${token}`)
            .send(body);

    /**
     * Refuses the pending tool or resource.
     *
     * @param token Access token
     * @param promptId Prompt that asked
     * @param body Domain, name, and kind from the permission event
     * @returns The HTTP response
     */
    const refuse = (
        token: string,
        promptId: string,
        body: { domain: string; name: string; kind: 'tool' | 'resource' }
    ) =>
        agent
            .post(withId(constants.routes.mcp.refusePrompt, promptId))
            .set('Authorization', `Bearer ${token}`)
            .send(body);

    /**
     * Stops a prompt that is being answered.
     *
     * @param token Access token
     * @param promptId Prompt to stop
     * @returns The HTTP response
     */
    const stop = (token: string, promptId: string) =>
        agent.post(withId(constants.routes.mcp.stopPrompt, promptId)).set('Authorization', `Bearer ${token}`);

    /**
     * Opens the prompt stream, runs the body, and closes the socket afterward.
     *
     * @param token Access token
     * @param fn Work that reads the open stream
     * @returns Whatever `fn` returns
     */
    const runWithStream = async <T>(
        token: string,
        // eslint-disable-next-line no-unused-vars
        fn: (stream: McpStream) => Promise<T>
    ): Promise<T> => {
        const stream = await openMcpStream(agent, token);

        try {
            return await fn(stream);
        } finally {
            stream.close();
        }
    };

    /**
     * Runs a prompt whose model writes the answer immediately, and waits until that answer is saved.
     *
     * @param token Access token
     * @param conversationId Conversation the prompt runs in
     * @param prompt Prompt text
     * @param answer Answer text the model returns
     */
    const saveAnswer = async (token: string, conversationId: string, prompt: string, answer: string): Promise<void> => {
        useRemote({ steps: [{ type: 'answer', content: answer }] });
        await runWithStream(token, async stream => {
            const pending = stream.waitFor(event => event.event === events.answer && event.data.content === answer);
            const started = await startPrompt(token, conversationId, prompt);

            expect(started.status).toBe(200);
            await pending;
        });
    };

    beforeAll(async () => {
        installRemoteFetch();
        app = await initServer();
        agent = getAgent(app);
    });

    beforeEach(async () => {
        await settleRemote();
        await deleteCronJobs();
        await clearCollections();
    });

    afterAll(async () => {
        await settleRemote();
        await deleteCronJobs();
        await clearCollections();
        await disconnectMongo();
        vi.unstubAllGlobals();
    });

    describe(`POST ${constants.routes.mcp.createConversation} — [HTTP-AUTH-TOK-003]`, () => {
        it('rejects a conversation request without an Authorization header', async () => {
            const response = await agent.post(constants.routes.mcp.createConversation);

            expect(response.status).toBe(400);
            expectErrorEnvelope(response.body, ErrorCode.VALIDATION_ERROR);
        });
    });

    describe('[HTTP-MCP-CNV-001]', () => {
        it('creates an empty conversation', async () => {
            const token = await registerUser();
            const response = await agent
                .post(constants.routes.mcp.createConversation)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expectSuccessEnvelope(response.body);
            expect(response.body.data.conversationId).toEqual(expect.any(String));
            expect((response.body.data.conversationId as string).length).toBeGreaterThan(0);
        });
    });

    describe('[HTTP-MCP-CNV-002]', () => {
        it('lists only this user’s conversations, oldest first', async () => {
            const token = await registerUser();
            const other = await registerUser();
            const first = await createConversation(token);
            const second = await createConversation(token);
            const theirs = await createConversation(other);

            const response = await agent
                .get(constants.routes.mcp.listConversations)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expectSuccessEnvelope(response.body);
            expect(response.body.data).toEqual([{ conversationId: first }, { conversationId: second }]);
            expect(response.body.data).not.toContainEqual({ conversationId: theirs });
        });
    });

    describe('[HTTP-MCP-CNV-003]', () => {
        it('reads an empty conversation whose id matches the path', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const response = await readConversation(token, conversationId);

            expect(response.status).toBe(200);
            expectSuccessEnvelope(response.body);
            expect(response.body.data).toEqual({ conversationId, turns: [] });
        });
    });

    describe('[HTTP-MCP-CNV-004]', () => {
        it('saves a finished answer as a new last turn', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'Say hi';
            const answer = 'Hello';

            await saveAnswer(token, conversationId, prompt, answer);

            const response = await readConversation(token, conversationId);
            const turns = response.body.data.turns as Turn[];

            expect(response.status).toBe(200);
            expect(turns).toHaveLength(1);
            expect(turns[0]?.prompt).toBe(prompt);
            expect(turns[0]?.answer).toBe(answer);
            expect(turns[0]?.turnId).toEqual(expect.any(String));
        });
    });

    describe('[HTTP-MCP-CNV-005]', () => {
        it('does not save a turn when the prompt is stopped', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'Wait';

            useRemote({
                tools: [sendTool],
                steps: [{ type: 'tool', domain, name: 'send', arguments: { text: 'hi' } }],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, prompt);

                expect(started.status).toBe(200);
                await permission;

                const stopped = stream.waitFor(event => event.event === events.stopped);
                const response = await stop(token, started.body.data.promptId as string);

                expect(response.status).toBe(200);
                await stopped;
            });

            const response = await readConversation(token, conversationId);

            expect(response.body.data.turns).toEqual([]);
        });

        it('does not save a turn when the prompt ends in error', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'provider-failure' }] });
            await runWithStream(token, async stream => {
                const failed = stream.waitFor(event => event.event === events.error);
                const started = await startPrompt(token, conversationId, 'Fail');

                expect(started.status).toBe(200);
                await failed;
            });

            const response = await readConversation(token, conversationId);

            expect(response.body.data.turns).toEqual([]);
        });
    });

    describe('[HTTP-MCP-CNV-006]', () => {
        it('deletes the conversation and returns that id', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const response = await agent
                .delete(withId(constants.routes.mcp.deleteConversation, conversationId))
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expectSuccessEnvelope(response.body);
            expect(response.body.data).toEqual({ conversationId });
        });
    });

    describe('[HTTP-MCP-PRG-001]', () => {
        it('opens an SSE stream', async () => {
            const token = await registerUser();
            const stream = await openMcpStream(agent, token);

            try {
                expect(stream.status).toBe(200);
                expect(stream.headers['content-type']).toContain('text/event-stream');
                expect(stream.headers['cache-control']).toBe('no-cache, no-transform');
                expect(stream.headers.connection).toBe('keep-alive');
                expect(stream.headers['x-accel-buffering']).toBe('no');
            } finally {
                stream.close();
            }
        });
    });

    describe('[HTTP-MCP-PRG-002]', () => {
        it('sends selecting when the prompt asks for the list', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'answer', content: 'Done' }] });
            await runWithStream(token, async stream => {
                const selecting = stream.waitFor(event => event.event === events.selecting);
                const started = await startPrompt(token, conversationId, 'List');
                const event = await selecting;

                expect(started.status).toBe(200);
                expect(event.data.promptId).toBe(started.body.data.promptId);
                expect(event.data.type).toBe(events.selecting);
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-PRG-003]', () => {
        it('sends permission before the matching processing call', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, promptId, sendSelection);
                await finished;

                const names = labels(stream.events());

                expect(names.indexOf(events.permission)).toBeLessThan(names.indexOf('call:processing'));
            });
        });
    });

    describe('[HTTP-MCP-PRG-004]', () => {
        it('sends processing, then succeeded, before the answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, started.body.data.promptId as string, sendSelection);
                await finished;

                expect(labels(stream.events())).toEqual([
                    events.selecting,
                    events.permission,
                    'call:processing',
                    'call:succeeded',
                    events.answering,
                    events.answer,
                ]);
            });
        });
    });

    describe('[HTTP-MCP-PRG-005]', () => {
        it('sends answering after the call and before the answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, started.body.data.promptId as string, sendSelection);
                await finished;

                const names = labels(stream.events());

                expect(names.indexOf(events.answering)).toBeGreaterThan(names.indexOf('call:succeeded'));
                expect(names.indexOf(events.answering)).toBeLessThan(names.indexOf(events.answer));
            });
        });

        it('sends answering directly after selecting when no tool or resource ran', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'answer', content: 'Plain' }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                const started = await startPrompt(token, conversationId, 'Plain');

                expect(started.status).toBe(200);
                await finished;
                expect(labels(stream.events())).toEqual([events.selecting, events.answering, events.answer]);
            });
        });
    });

    describe('[HTTP-MCP-PRG-006]', () => {
        it('sends the finished answer with content and the prompt start time', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const content = 'Hello';

            useRemote({ steps: [{ type: 'answer', content }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                const started = await startPrompt(token, conversationId, 'Hi');

                expect(started.status).toBe(200);
                const answer = await finished;

                const startedAt = answer.data.startedAt as string;
                const finishedAt = answer.data.finishedAt as string;

                expect(answer.data.content).toBe(content);
                expect(answer.data.promptId).toBe(started.body.data.promptId);
                expectIso8601UtcTimestamp(startedAt);
                expectIso8601UtcTimestamp(finishedAt);
                expect(finishedAt >= startedAt).toBe(true);
            });
        });
    });

    describe('[HTTP-MCP-PRG-007]', () => {
        it('returns a prompt id and later events use it', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'answer', content: 'Done' }] });
            await runWithStream(token, async stream => {
                const selecting = stream.waitFor(event => event.event === events.selecting);
                const response = await startPrompt(token, conversationId, 'Start');

                expect(response.status).toBe(200);
                expectSuccessEnvelope(response.body);
                expect(response.body.data.promptId).toEqual(expect.any(String));

                const event = await selecting;

                expect(event.data.promptId).toBe(response.body.data.promptId);
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-PRG-008]', () => {
        it('rejects a second prompt while the first is waiting on permission', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const first = await startPrompt(token, conversationId, 'First');
                const promptId = first.body.data.promptId as string;

                await permission;

                const second = await startPrompt(token, conversationId, 'Second');

                expect(second.status).toBe(422);
                expectErrorEnvelope(second.body, ErrorCode.BUSINESS_LOGIC_ERROR);

                const finished = stream.waitFor(event => event.event === events.answer);
                const allowed = await permit(token, promptId, sendSelection);

                expect(allowed.status).toBe(200);
                await finished;
                expect(stream.events().filter(event => event.data.promptId === promptId).length).toBeGreaterThan(0);
                expect(stream.events().some(event => event.data.promptId !== promptId && event.data.promptId)).toBe(
                    false
                );
            });
        });
    });

    describe('[HTTP-MCP-PRG-009]', () => {
        it('replays the open permission after the stream closes and keeps the prompt running', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const argumentsForSend = { text: 'hi' };

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: argumentsForSend },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            const first = await openMcpStream(agent, token);

            try {
                const permission = first.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;
                const asked = await permission;

                first.close();

                const second = await openMcpStream(agent, token);

                try {
                    const replayed = await second.waitFor(event => event.event === events.permission);

                    expect(replayed.data).toMatchObject({
                        promptId,
                        domain,
                        name: 'send',
                        kind: 'tool',
                        arguments: argumentsForSend,
                    });
                    expect(asked.data).toMatchObject({ promptId, arguments: argumentsForSend });
                    expect(second.events().some(event => event.event === events.selecting)).toBe(false);

                    const finished = second.waitFor(event => event.event === events.answer);
                    const allowed = await permit(token, promptId, sendSelection);

                    expect(allowed.status).toBe(200);
                    await finished;
                } finally {
                    second.close();
                }
            } finally {
                first.close();
            }

            const saved = await readConversation(token, conversationId);

            expect(saved.body.data.turns).toEqual([expect.objectContaining({ prompt: 'Send', answer: 'Sent' })]);
        });
    });

    describe('[HTTP-MCP-SEL-001]', () => {
        it('waits with the arguments, then processing follows a permit', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const argumentsForSend = { text: 'hi' };

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: argumentsForSend },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const asked = await permission;

                expect(asked.data).toMatchObject({ domain, name: 'send', kind: 'tool', arguments: argumentsForSend });
                expect(stream.events().some(event => event.event === events.call)).toBe(false);

                const processing = stream.waitFor(
                    event => event.event === events.call && event.data.status === 'processing'
                );
                await permit(token, started.body.data.promptId as string, sendSelection);
                const call = await processing;

                expect(call.data.arguments).toEqual(argumentsForSend);
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-SEL-002]', () => {
        it('sends the next permission only after the first call succeeds', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [lookupTool, sendTool],
                steps: [
                    { type: 'tool', domain, name: 'lookup', arguments: { text: 'one' } },
                    { type: 'tool', domain, name: 'send', arguments: { text: 'two' } },
                    { type: 'answer', content: 'Done' },
                ],
            });

            await runWithStream(token, async stream => {
                const firstAsk = stream.waitFor(
                    event => event.event === events.permission && event.data.name === 'lookup'
                );
                const started = await startPrompt(token, conversationId, 'Both');
                const promptId = started.body.data.promptId as string;

                await firstAsk;
                const secondAsk = stream.waitFor(
                    event => event.event === events.permission && event.data.name === 'send'
                );
                await permit(token, promptId, { domain, name: 'lookup', kind: 'tool' });
                await secondAsk;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, promptId, sendSelection);
                await finished;

                const names = labels(stream.events());

                expect(names.indexOf('call:succeeded')).toBeLessThan(names.lastIndexOf(events.permission));
                expect(names.filter(name => name === events.permission)).toHaveLength(2);
            });
        });
    });

    describe('[HTTP-MCP-SEL-003]', () => {
        it('allows the pending tool and returns that prompt id', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const argumentsForSend = { text: 'hi' };

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: argumentsForSend },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;
                const processing = stream.waitFor(event => event.data.status === 'processing');
                const response = await permit(token, promptId, sendSelection);
                const call = await processing;

                expect(response.status).toBe(200);
                expectSuccessEnvelope(response.body);
                expect(response.body.data).toEqual({ promptId });
                expect(call.data).toMatchObject({ domain, name: 'send', kind: 'tool', arguments: argumentsForSend });
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-SEL-004]', () => {
        it('rejects a permit whose body is not the pending ask', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;

                const mismatch = await permit(token, promptId, { domain, name: 'other', kind: 'tool' });

                expect(mismatch.status).toBe(422);
                expectErrorEnvelope(mismatch.body, ErrorCode.BUSINESS_LOGIC_ERROR);
                expect(stream.events().some(event => event.event === events.call)).toBe(false);

                const finished = stream.waitFor(event => event.event === events.answer);
                const allowed = await permit(token, promptId, sendSelection);

                expect(allowed.status).toBe(200);
                await finished;
            });
        });

        it('rejects a permit when nothing is pending', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'answer', content: 'Done' }] });
            const promptId = await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                const started = await startPrompt(token, conversationId, 'Done');

                await finished;

                return started.body.data.promptId as string;
            });

            const response = await permit(token, promptId, sendSelection);

            expect(response.status).toBe(422);
            expectErrorEnvelope(response.body, ErrorCode.BUSINESS_LOGIC_ERROR);
        });
    });

    describe('[HTTP-MCP-SEL-005]', () => {
        it('marks the call refused and continues to an answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const argumentsForSend = { text: 'no' };

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: argumentsForSend },
                    { type: 'answer', content: 'Skipped' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;
                const response = await refuse(token, promptId, sendSelection);
                const finished = await stream.waitFor(event => event.event === events.answer);
                const refused = stream.events().find(event => event.data.status === 'refused');

                expect(response.status).toBe(200);
                expectSuccessEnvelope(response.body);
                expect(response.body.data).toEqual({ promptId });
                expect(refused?.data).toMatchObject({
                    domain,
                    name: 'send',
                    kind: 'tool',
                    arguments: argumentsForSend,
                    status: 'refused',
                });
                expect(refused?.data.result).toBeUndefined();
                expect(stream.events().some(event => event.data.status === 'processing')).toBe(false);
                expect(finished.data.content).toBe('Skipped');
            });
        });
    });

    describe('[HTTP-MCP-SEL-006]', () => {
        it('keeps the ask open with no error and no call', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [{ type: 'tool', domain, name: 'send', arguments: { text: 'hi' } }],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Wait');
                const promptId = started.body.data.promptId as string;

                await permission;
                await new Promise<void>(resolve => {
                    setTimeout(resolve, 300);
                });

                expect(stream.events().some(event => event.event === events.error || event.event === events.call)).toBe(
                    false
                );

                const stopped = stream.waitFor(event => event.event === events.stopped);
                await stop(token, promptId);
                await stopped;
            });
        });
    });

    describe('[HTTP-MCP-ORD-001]', () => {
        it('does not send another permission while a call is processing', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool, lookupTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Done' },
                ],
                toolResults: { send: { hang: true } },
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');

                await permission;
                const processing = stream.waitFor(event => event.data.status === 'processing');
                await permit(token, started.body.data.promptId as string, sendSelection);
                await processing;
                await new Promise<void>(resolve => {
                    setTimeout(resolve, 150);
                });

                expect(stream.events().filter(event => event.event === events.permission)).toHaveLength(1);
                expect(stream.events().filter(event => event.data.status === 'processing')).toHaveLength(1);
                expect(
                    stream.events().some(event => event.data.status === 'succeeded' || event.data.status === 'failed')
                ).toBe(false);
                expect(
                    stream.events().some(event => event.event === events.answer || event.event === events.answering)
                ).toBe(false);

                releaseHungCalls();
                await stream.waitFor(event => event.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-FLR-001]', () => {
        it('continues after a tool reports failure', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Continued' },
                ],
                toolResults: { send: { text: 'nope', isError: true } },
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, started.body.data.promptId as string, sendSelection);
                const answer = await finished;
                const failed = stream.events().find(event => event.data.status === 'failed');

                expect(failed?.data).toMatchObject({ domain, name: 'send', kind: 'tool' });
                expect(answer.data.content).toBe('Continued');
                expect(labels(stream.events()).indexOf('call:failed')).toBeLessThan(
                    labels(stream.events()).indexOf(events.answer)
                );
            });
        });
    });

    describe('[HTTP-MCP-FLR-002]', () => {
        it('sends error when the model provider fails and does not send an answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'provider-failure' }] });
            await runWithStream(token, async stream => {
                const failed = stream.waitFor(event => event.event === events.error);
                const started = await startPrompt(token, conversationId, 'Fail');
                const error = await failed;

                expect(started.status).toBe(200);
                expect(error.data.promptId).toBe(started.body.data.promptId);
                expect(typeof error.data.context).toBe('string');
                expect((error.data.context as string).length).toBeGreaterThan(0);
                expect(stream.events().some(event => event.event === events.answer)).toBe(false);
            });
        });

        it('sends error when the server fails and does not send an answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ listStatus: 500, steps: [{ type: 'answer', content: 'Nope' }] });
            await runWithStream(token, async stream => {
                const failed = stream.waitFor(event => event.event === events.error);
                await startPrompt(token, conversationId, 'Fail');
                const error = await failed;

                expect(typeof error.data.context).toBe('string');
                expect((error.data.context as string).length).toBeGreaterThan(0);
                expect(error.data.list).toBeUndefined();
                expect(stream.events().some(event => event.event === events.answer)).toBe(false);
            });
        });
    });

    describe('[HTTP-MCP-REC-001]', () => {
        it('puts the same arguments on the permission and the call', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const argumentsForSend = { text: 'same' };

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: argumentsForSend },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const asked = await permission;
                const succeeded = stream.waitFor(event => event.data.status === 'succeeded');

                await permit(token, started.body.data.promptId as string, sendSelection);
                const call = await succeeded;

                expect(asked.data.arguments).toEqual(argumentsForSend);
                expect(call.data.arguments).toEqual(asked.data.arguments);
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-REC-002]', () => {
        it('includes a result on a succeeded call', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
                toolResults: { send: { text: 'delivered' } },
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');

                await permission;
                const succeeded = stream.waitFor(event => event.data.status === 'succeeded');
                await permit(token, started.body.data.promptId as string, sendSelection);
                const call = await succeeded;

                expect(call.data.result).toEqual({ content: [{ type: 'text', text: 'delivered' }] });
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-REC-003]', () => {
        it('records the tool message, the list, and the tool once under its domain', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'Send';

            useRemote({
                tools: [sendTool],
                resources: [inboxResource],
                templates: [chatTemplate],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
                toolResults: { send: { text: 'delivered' } },
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, prompt);

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await permit(token, started.body.data.promptId as string, sendSelection);
                const answer = await finished;

                expect(answer.data.messages).toEqual([
                    { role: 'user', content: prompt },
                    { role: 'tool', content: 'delivered' },
                ]);
                expect(answer.data.domains).toEqual([{ name: domain, tools: [{ name: 'send' }], resources: [] }]);
                expect(answer.data.list).toEqual({
                    tools: [
                        {
                            domain,
                            name: 'send',
                            argumentFields: [{ name: 'text', type: 'string', required: true }],
                        },
                    ],
                    resources: [
                        { domain, name: 'inbox', uri: 'whatsapp://inbox' },
                        { domain, name: 'chat', uriTemplate: 'whatsapp://chats/{chatId}' },
                    ],
                });
            });
        });

        it('records a refusal as a tool message and does not list it as used', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'Send';

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'no' } },
                    { type: 'answer', content: 'Skipped' },
                ],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, prompt);

                await permission;
                const finished = stream.waitFor(event => event.event === events.answer);
                await refuse(token, started.body.data.promptId as string, sendSelection);
                const answer = await finished;

                expect(answer.data.messages).toEqual([
                    { role: 'user', content: prompt },
                    { role: 'tool', content: 'The user refused this tool.' },
                ]);
                expect(answer.data.domains).toEqual([]);
            });
        });
    });

    describe('[HTTP-MCP-ARG-001]', () => {
        it('fills the next arguments from the earlier tool result', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [lookupTool, sendTool],
                steps: [
                    { type: 'tool', domain, name: 'lookup', arguments: { text: 'invoice' } },
                    { type: 'tool-from-result', domain, name: 'send', argumentName: 'text' },
                    { type: 'answer', content: 'Sent' },
                ],
                toolResults: { lookup: { text: 'invoice-42' }, send: { text: 'ok' } },
            });

            await runWithStream(token, async stream => {
                const firstAsk = stream.waitFor(event => event.data.name === 'lookup');
                const started = await startPrompt(token, conversationId, 'Find then send');
                const promptId = started.body.data.promptId as string;

                await firstAsk;
                const secondAsk = stream.waitFor(
                    event => event.event === events.permission && event.data.name === 'send'
                );
                await permit(token, promptId, { domain, name: 'lookup', kind: 'tool' });
                const asked = await secondAsk;
                const call = stream.waitFor(event => event.data.status === 'succeeded' && event.data.name === 'send');

                await permit(token, promptId, sendSelection);
                const sent = await call;

                expect(asked.data.arguments).toEqual({ text: 'invoice-42' });
                expect(sent.data.arguments).toEqual({ text: 'invoice-42' });
                await stream.waitFor(item => item.event === events.answer);
            });
        });
    });

    describe('[HTTP-MCP-ARG-002]', () => {
        it('returns the list the model asked for on the answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                resources: [inboxResource],
                templates: [chatTemplate],
                steps: [{ type: 'answer', content: 'Listed' }],
            });

            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                await startPrompt(token, conversationId, 'List');
                const answer = await finished;

                expect(answer.data.list).toEqual({
                    tools: [
                        {
                            domain,
                            name: 'send',
                            argumentFields: [{ name: 'text', type: 'string', required: true }],
                        },
                    ],
                    resources: [
                        { domain, name: 'inbox', uri: 'whatsapp://inbox' },
                        { domain, name: 'chat', uriTemplate: 'whatsapp://chats/{chatId}' },
                    ],
                });
            });
        });
    });

    describe('[HTTP-MCP-CTX-001]', () => {
        it('sends only the selected turns, in saved order, then the new prompt', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            await saveAnswer(token, conversationId, 'first', 'one');
            await saveAnswer(token, conversationId, 'second', 'two');
            const turns = (await readConversation(token, conversationId)).body.data.turns as Turn[];
            const selected = turns[0]?.turnId as string;

            useRemote({ steps: [{ type: 'answer', content: 'third-answer' }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                await startPrompt(token, conversationId, 'third', [selected]);
                const answer = await finished;

                expect(answer.data.messages).toEqual([
                    { role: 'user', content: 'first' },
                    { role: 'assistant', content: 'one' },
                    { role: 'user', content: 'third' },
                ]);
                expect(answer.data.list).toEqual({ tools: [], resources: [] });
            });
        });
    });

    describe('[HTTP-MCP-CTX-002]', () => {
        it('sends every finished turn when turnIds is omitted', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            await saveAnswer(token, conversationId, 'first', 'one');
            await saveAnswer(token, conversationId, 'second', 'two');

            useRemote({ steps: [{ type: 'answer', content: 'third-answer' }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                await startPrompt(token, conversationId, 'third');
                const answer = await finished;

                expect(answer.data.messages).toEqual([
                    { role: 'user', content: 'first' },
                    { role: 'assistant', content: 'one' },
                    { role: 'user', content: 'second' },
                    { role: 'assistant', content: 'two' },
                    { role: 'user', content: 'third' },
                ]);
            });
        });

        it('sends every finished turn when turnIds is empty', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            await saveAnswer(token, conversationId, 'first', 'one');

            useRemote({ steps: [{ type: 'answer', content: 'second-answer' }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                await startPrompt(token, conversationId, 'second', []);
                const answer = await finished;

                expect(answer.data.messages).toEqual([
                    { role: 'user', content: 'first' },
                    { role: 'assistant', content: 'one' },
                    { role: 'user', content: 'second' },
                ]);
            });
        });

        it('sends only the new prompt when the conversation has no finished turns', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'only';

            useRemote({ steps: [{ type: 'answer', content: 'answer' }] });
            await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                await startPrompt(token, conversationId, prompt);
                const answer = await finished;

                expect(answer.data.messages).toEqual([{ role: 'user', content: prompt }]);
            });
        });
    });

    describe('[HTTP-MCP-STP-001]', () => {
        it('stops an open ask and sends no later call or answer', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);
            const prompt = 'Wait';

            useRemote({
                tools: [sendTool],
                steps: [{ type: 'tool', domain, name: 'send', arguments: { text: 'hi' } }],
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, prompt);
                const promptId = started.body.data.promptId as string;

                await permission;
                const stopped = stream.waitFor(event => event.event === events.stopped);
                const response = await stop(token, promptId);
                const event = await stopped;
                const after = stream
                    .events()
                    .slice(stream.events().findIndex(item => item.event === events.stopped) + 1);

                expect(response.status).toBe(200);
                expectSuccessEnvelope(response.body);
                expect(response.body.data).toEqual({ promptId });
                expect(event.data.messages).toEqual([{ role: 'user', content: prompt }]);
                expect(event.data.list).toEqual({
                    tools: [
                        {
                            domain,
                            name: 'send',
                            argumentFields: [{ name: 'text', type: 'string', required: true }],
                        },
                    ],
                    resources: [],
                });
                expect(after).toEqual([]);
                expect(stream.events().some(item => item.event === events.call || item.event === events.answer)).toBe(
                    false
                );
            });
        });

        it('cancels an in-flight call and does not report it succeeded or failed', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Nope' },
                ],
                toolResults: { send: { hang: true } },
            });

            await runWithStream(token, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(token, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;
                const processing = stream.waitFor(event => event.data.status === 'processing');
                await permit(token, promptId, sendSelection);
                await processing;

                const stopped = stream.waitFor(event => event.event === events.stopped);
                const response = await stop(token, promptId);

                expect(response.status).toBe(200);
                await stopped;
                expect(
                    stream.events().some(event => event.data.status === 'succeeded' || event.data.status === 'failed')
                ).toBe(false);
                expect(
                    stream.events().some(event => event.event === events.answer || event.event === events.answering)
                ).toBe(false);
            });
        });
    });

    describe('[HTTP-MCP-STP-002]', () => {
        it('rejects a stop after the prompt has answered', async () => {
            const token = await registerUser();
            const conversationId = await createConversation(token);

            useRemote({ steps: [{ type: 'answer', content: 'Done' }] });
            const promptId = await runWithStream(token, async stream => {
                const finished = stream.waitFor(event => event.event === events.answer);
                const started = await startPrompt(token, conversationId, 'Done');

                await finished;

                return started.body.data.promptId as string;
            });

            const response = await stop(token, promptId);

            expect(response.status).toBe(422);
            expectErrorEnvelope(response.body, ErrorCode.BUSINESS_LOGIC_ERROR);
        });
    });

    describe('[HTTP-MCP-OWN-001]', () => {
        it('hides an unknown prompt id', async () => {
            const token = await registerUser();
            const promptId = 'missing-prompt-id';
            const permitResponse = await permit(token, promptId, sendSelection);
            const refuseResponse = await refuse(token, promptId, sendSelection);
            const stopResponse = await stop(token, promptId);

            expect(permitResponse.status).toBe(404);
            expectErrorEnvelope(permitResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(refuseResponse.status).toBe(404);
            expectErrorEnvelope(refuseResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(stopResponse.status).toBe(404);
            expectErrorEnvelope(stopResponse.body, ErrorCode.NOT_FOUND_ERROR);
        });

        it('hides a prompt started by a different user', async () => {
            const owner = await registerUser();
            const other = await registerUser();
            const conversationId = await createConversation(owner);

            useRemote({
                tools: [sendTool],
                steps: [
                    { type: 'tool', domain, name: 'send', arguments: { text: 'hi' } },
                    { type: 'answer', content: 'Sent' },
                ],
            });

            await runWithStream(owner, async stream => {
                const permission = stream.waitFor(event => event.event === events.permission);
                const started = await startPrompt(owner, conversationId, 'Send');
                const promptId = started.body.data.promptId as string;

                await permission;

                const permitResponse = await permit(other, promptId, sendSelection);
                const refuseResponse = await refuse(other, promptId, sendSelection);
                const stopResponse = await stop(other, promptId);

                expect(permitResponse.status).toBe(404);
                expectErrorEnvelope(permitResponse.body, ErrorCode.NOT_FOUND_ERROR);
                expect(refuseResponse.status).toBe(404);
                expectErrorEnvelope(refuseResponse.body, ErrorCode.NOT_FOUND_ERROR);
                expect(stopResponse.status).toBe(404);
                expectErrorEnvelope(stopResponse.body, ErrorCode.NOT_FOUND_ERROR);

                const finished = stream.waitFor(event => event.event === events.answer);
                const allowed = await permit(owner, promptId, sendSelection);

                expect(allowed.status).toBe(200);
                await finished;
            });
        });
    });

    describe('[HTTP-MCP-OWN-002]', () => {
        it('hides an unknown conversation id', async () => {
            const token = await registerUser();
            const conversationId = 'missing-conversation-id';
            const readResponse = await readConversation(token, conversationId);
            const deleteResponse = await agent
                .delete(withId(constants.routes.mcp.deleteConversation, conversationId))
                .set('Authorization', `Bearer ${token}`);
            const startResponse = await startPrompt(token, conversationId, 'Hi');

            expect(readResponse.status).toBe(404);
            expectErrorEnvelope(readResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(deleteResponse.status).toBe(404);
            expectErrorEnvelope(deleteResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(startResponse.status).toBe(404);
            expectErrorEnvelope(startResponse.body, ErrorCode.NOT_FOUND_ERROR);
        });

        it('hides a conversation owned by a different user', async () => {
            const owner = await registerUser();
            const other = await registerUser();
            const conversationId = await createConversation(owner);
            const readResponse = await readConversation(other, conversationId);
            const deleteResponse = await agent
                .delete(withId(constants.routes.mcp.deleteConversation, conversationId))
                .set('Authorization', `Bearer ${other}`);
            const startResponse = await startPrompt(other, conversationId, 'Hi');
            const stillThere = await readConversation(owner, conversationId);

            expect(readResponse.status).toBe(404);
            expectErrorEnvelope(readResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(deleteResponse.status).toBe(404);
            expectErrorEnvelope(deleteResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(startResponse.status).toBe(404);
            expectErrorEnvelope(startResponse.body, ErrorCode.NOT_FOUND_ERROR);
            expect(stillThere.status).toBe(200);
            expect(stillThere.body.data.conversationId).toBe(conversationId);
        });
    });
});
