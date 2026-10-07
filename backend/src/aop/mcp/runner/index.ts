import { Aborter } from 'aop/aborter';
import { MongoClientManager } from 'aop/db/mongo/client';
import { DbContext } from 'aop/db/mongo/context';
import { Emitter } from 'aop/emitter';
import { BusinessLogicException, ResourceNotFoundException } from 'aop/exceptions';
import { logger } from 'aop/logging';
import { McpClient } from 'aop/mcp/client';
import type { McpResourceReadResult } from 'aop/mcp/client/types';
import { ModelGateway } from 'aop/mcp/gateway';
import type { ModelList, ModelStep } from 'aop/mcp/gateway/types';
import { buildCatalog } from 'aop/mcp/gateway/utils';

import { FINISHED_PROMPT_LIMIT } from './constants';
import {
    expandUriTemplate,
    failureContext,
    isAbortError,
    refusalContent,
    resourceMessageContent,
    seedMessages,
    selectTurns,
    toDomains,
    toolMessageContent,
    toResourceResult,
    toToolResult,
    toWireList,
} from './utils';
import constants from 'shared/constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import type {
    ConversationStore,
    FinishedPrompt,
    PromptRun,
    PromptRunnerDependencies,
    PromptSelection,
    StartPromptInput,
} from './types';
import type { McpAnswerEvent, McpPermissionEvent } from 'shared/types/mcp/events';

/**
 * Singleton that runs one prompt at a time in a conversation.
 * Each step asks the model for the next tool or resource, or for the answer.
 * The user allows or refuses that exact call. Stop aborts in-flight work.
 *
 * Realizes:
 * - HTTP-MCP-PRG-007 / HTTP-MCP-PRG-008 — start one prompt; reject a second while one is being answered
 * - HTTP-MCP-PRG-009 — an open permission survives a closed stream and is replayed on the next one
 * - HTTP-MCP-CTX-001 / HTTP-MCP-CTX-002 — selected turns, or every finished turn
 * - HTTP-MCP-SEL-001 / HTTP-MCP-SEL-005 — permission, then permit or refuse
 * - HTTP-MCP-FLR-001 / HTTP-MCP-FLR-002 — a failed tool continues; a provider or server failure ends the prompt
 * - HTTP-MCP-STP-001 / HTTP-MCP-STP-002 — stop while answering; reject a stop that is not
 * - HTTP-MCP-OWN-001 — another user's prompt is the same miss as an unknown id
 * - HTTP-MCP-REC-003 — domains list each tool and resource that ran, once
 *
 * The step loop starts after `start` returns, so the HTTP 200 goes out before the first event.
 */
class PromptRunner {
    private static instance: PromptRunner | null = null;
    private readonly client: PromptRunnerDependencies['client'];
    private readonly gateway: PromptRunnerDependencies['gateway'];
    private readonly emitter: PromptRunnerDependencies['emitter'];
    private readonly conversations: ConversationStore;
    private readonly now: () => Date;
    private readonly createId: () => string;
    private readonly finishedPromptLimit: number;
    private readonly activePrompts = new Map<string, PromptRun>();
    private readonly activePromptByConversation = new Map<string, string>();
    private readonly finishedPrompts = new Map<string, FinishedPrompt>();

    /**
     * @param dependencies Client, gateway, emitter, and conversation store. Tests pass fakes.
     */
    private constructor(dependencies: PromptRunnerDependencies) {
        this.client = dependencies.client;
        this.gateway = dependencies.gateway;
        this.emitter = dependencies.emitter;
        this.conversations = dependencies.conversations;
        this.now = dependencies.now ?? (() => new Date());
        this.createId = dependencies.createId ?? (() => crypto.randomUUID());
        this.finishedPromptLimit = dependencies.finishedPromptLimit ?? FINISHED_PROMPT_LIMIT;
    }

    /**
     * Builds a runner that is not the process singleton.
     * {@link createPromptRunner} and {@link PromptRunner.getInstance} both use this.
     *
     * @param dependencies Client, gateway, emitter, and conversation store
     */
    static create(dependencies: PromptRunnerDependencies): PromptRunner {
        return new PromptRunner(dependencies);
    }

    /**
     * Returns the process-wide runner, creating it with the real client, gateway, and store.
     */
    static getInstance(): PromptRunner {
        if (!PromptRunner.instance) {
            PromptRunner.instance = PromptRunner.create({
                client: new McpClient(),
                gateway: new ModelGateway(),
                emitter: Emitter.getInstance(),
                conversations: conversationStore(),
            });
        }

        return PromptRunner.instance;
    }

    /**
     * Reserves the conversation and starts the step loop.
     * Invalid turns and a busy conversation throw before the prompt id is returned.
     * The loop itself runs after this method returns.
     *
     * @param input Conversation, prompt, and optional turn ids
     * @returns The prompt id events will use
     * @throws ResourceNotFoundException when the conversation is missing or owned by someone else
     * @throws BusinessLogicException when a turn id is not a finished turn, or the conversation is busy
     */
    public async start(input: StartPromptInput): Promise<{ promptId: string }> {
        const conversation = await this.conversations.getByIdForUser(input.conversationId, input.userId);
        const turns = selectTurns(conversation.turns, input.turnIds);

        if (this.activePromptByConversation.has(input.conversationId)) {
            throw new BusinessLogicException(ErrorMessage.MCP_CONVERSATION_BUSY);
        }

        const promptId = this.createId();
        const run: PromptRun = {
            promptId,
            userId: input.userId,
            conversationId: input.conversationId,
            prompt: input.prompt,
            phase: 'selecting',
            startedAt: this.now().toISOString(),
            aborter: new Aborter(),
            messages: seedMessages(turns, input.prompt),
            used: [],
            terminalEventSent: false,
        };

        this.activePrompts.set(promptId, run);
        this.activePromptByConversation.set(input.conversationId, promptId);

        // After the caller writes the 200. A microtask would run before that write.
        setImmediate(() => {
            void this.execute(run).catch(error => {
                logger.error(`Prompt run failed for prompt ${promptId}`, { error: error as Error });
            });
        });

        return { promptId };
    }

    /**
     * Allows the pending tool or resource.
     *
     * @param promptId Prompt that asked
     * @param userId User who must own it
     * @param selection Domain, name, and kind from the permission event
     * @throws ResourceNotFoundException when the id is unknown or owned by someone else
     * @throws BusinessLogicException when nothing is pending or the body is a different item
     */
    public permit(promptId: string, userId: string, selection: PromptSelection): void {
        this.settle(promptId, userId, selection, 'permit');
    }

    /**
     * Refuses the pending tool or resource.
     *
     * @param promptId Prompt that asked
     * @param userId User who must own it
     * @param selection Domain, name, and kind from the permission event
     * @throws ResourceNotFoundException when the id is unknown or owned by someone else
     * @throws BusinessLogicException when nothing is pending or the body is a different item
     */
    public refuse(promptId: string, userId: string, selection: PromptSelection): void {
        this.settle(promptId, userId, selection, 'refuse');
    }

    /**
     * Stops a prompt that is being answered.
     * The `stopped` event is emitted by the step loop after this method returns.
     *
     * @param promptId Prompt to stop
     * @param userId User who must own it
     * @throws ResourceNotFoundException when the id is unknown or owned by someone else
     * @throws BusinessLogicException when this user owns the prompt and it is not being answered
     */
    public stop(promptId: string, userId: string): void {
        const run = this.activePrompts.get(promptId);

        if (run) {
            if (run.userId !== userId) {
                throw new ResourceNotFoundException(ErrorMessage.MCP_PROMPT_NOT_FOUND);
            }

            const pending = run.pendingPermission;

            this.claimTerminal(run, 'stopped');
            run.aborter.cancel();
            pending?.resolve('stopped');

            return;
        }

        const finished = this.finishedPrompts.get(promptId);

        if (!finished || finished.userId !== userId) {
            throw new ResourceNotFoundException(ErrorMessage.MCP_PROMPT_NOT_FOUND);
        }

        throw new BusinessLogicException(ErrorMessage.MCP_CANNOT_STOP_WHEN_NOT_ANSWERING);
    }

    /**
     * Open permission asks for this user, for a stream that connects while one is waiting.
     *
     * @param userId Owner whose asks to replay
     * @returns Permission events still unanswered
     */
    public getOpenPermissionsForUser(userId: string): McpPermissionEvent[] {
        const events: McpPermissionEvent[] = [];

        for (const run of this.activePrompts.values()) {
            if (run.userId !== userId || !run.pendingPermission) {
                continue;
            }

            events.push(this.permissionEvent(run, run.pendingPermission));
        }

        return events;
    }

    /**
     * Runs the prompt until it answers, stops, or fails.
     * Expected failures are emitted. This catch is the last resort.
     */
    private async execute(run: PromptRun): Promise<void> {
        try {
            await this.run(run);
        } catch (error) {
            await this.fail(run, error);
        }
    }

    /**
     * Fetches the list once, then steps until the model writes the answer.
     */
    private async run(run: PromptRun): Promise<void> {
        if (this.isStopped(run)) {
            this.emitStopped(run);

            return;
        }

        this.emitter.emit({
            type: constants.events.mcp.selecting,
            promptId: run.promptId,
            userId: run.userId,
        });

        const list = await this.fetchList(run.aborter.signal);

        if (this.isStopped(run)) {
            this.emitStopped(run);

            return;
        }

        run.list = list;
        run.wireList = toWireList(list);
        buildCatalog(list);

        while (this.isAnswering(run)) {
            const step = await this.gateway.step(run.messages, list, run.aborter.signal);

            if (this.isStopped(run)) {
                this.emitStopped(run);

                return;
            }

            if (step.type === 'answer') {
                await this.finishAnswer(run, step.content);

                return;
            }

            const decision = await this.ask(run, step);

            if (decision === 'stopped' || this.isStopped(run)) {
                this.emitStopped(run);

                return;
            }

            if (decision === 'refuse') {
                this.recordRefusal(run, step);
                run.phase = 'selecting';

                continue;
            }

            await this.performCall(run, step);

            if (this.isStopped(run)) {
                this.emitStopped(run);

                return;
            }

            run.phase = 'selecting';
        }
    }

    /**
     * Lists tools, resources, and resource templates on one abort signal.
     */
    private async fetchList(signal: AbortSignal): Promise<ModelList> {
        const [tools, resources, templates] = await Promise.all([
            this.client.listTools(signal),
            this.client.listResources(signal),
            this.client.listResourceTemplates(signal),
        ]);

        return { tools, resources, templates };
    }

    /**
     * Emits `permission` and parks until permit, refuse, or stop.
     * There is no timer.
     */
    private ask(
        run: PromptRun,
        step: Extract<ModelStep, { type: 'selection' }>
    ): Promise<'permit' | 'refuse' | 'stopped'> {
        if (this.isStopped(run)) {
            return Promise.resolve('stopped');
        }

        run.phase = 'awaitingPermission';

        const pending = {
            domain: step.domain,
            name: step.name,
            kind: step.kind,
            arguments: step.arguments,
        };

        this.emitter.emit(this.permissionEvent(run, pending));

        return new Promise(resolve => {
            run.pendingPermission = { ...pending, resolve };
        });
    }

    /**
     * Runs the permitted tool or resource, then records the outcome on the messages.
     * A tool that sets `isError` is a failed call and the next step still runs.
     * A server failure throws, and the prompt ends.
     */
    private async performCall(run: PromptRun, step: Extract<ModelStep, { type: 'selection' }>): Promise<void> {
        if (this.isStopped(run)) {
            return;
        }

        run.phase = 'calling';
        run.pendingPermission = undefined;

        const identity = {
            promptId: run.promptId,
            userId: run.userId,
            domain: step.domain,
            name: step.name,
            kind: step.kind,
            arguments: step.arguments,
        };

        this.emitter.emit({
            type: constants.events.mcp.call,
            status: 'processing',
            ...identity,
        });

        if (step.kind === 'tool') {
            const result = await this.client.callTool(step.name, step.arguments, run.aborter.signal);

            if (this.isStopped(run)) {
                return;
            }

            if (result.isError === true) {
                this.emitter.emit({
                    type: constants.events.mcp.call,
                    status: 'failed',
                    ...identity,
                });
                run.messages.push({ role: 'tool', content: toolMessageContent(result, true) });
                this.recordUse(run, step);

                return;
            }

            this.emitter.emit({
                type: constants.events.mcp.call,
                status: 'succeeded',
                ...identity,
                kind: 'tool',
                result: toToolResult(result),
            });
            run.messages.push({ role: 'tool', content: toolMessageContent(result, false) });
            this.recordUse(run, step);

            return;
        }

        const result = await this.readResource(run, step);

        if (this.isStopped(run)) {
            return;
        }

        this.emitter.emit({
            type: constants.events.mcp.call,
            status: 'succeeded',
            ...identity,
            kind: 'resource',
            result: toResourceResult(result),
        });
        run.messages.push({ role: 'resource', content: resourceMessageContent(result) });
        this.recordUse(run, step);
    }

    /**
     * Reads a concrete resource by its listed URI, or a template expanded with this step's arguments.
     */
    private async readResource(
        run: PromptRun,
        step: Extract<ModelStep, { type: 'selection' }>
    ): Promise<McpResourceReadResult> {
        const template = run.list?.templates.find(item => item.domain === step.domain && item.name === step.name);

        if (template) {
            return this.client.readResource(
                expandUriTemplate(template.uriTemplate, step.arguments),
                run.aborter.signal
            );
        }

        return this.client.readResource(this.client.resolveResourceUri(step.domain, step.name), run.aborter.signal);
    }

    /**
     * Emits the refusal and appends it so the next step can see it.
     * A refusal did not run, so it is not added to `domains`.
     */
    private recordRefusal(run: PromptRun, step: Extract<ModelStep, { type: 'selection' }>): void {
        run.pendingPermission = undefined;

        this.emitter.emit({
            type: constants.events.mcp.call,
            status: 'refused',
            promptId: run.promptId,
            userId: run.userId,
            domain: step.domain,
            name: step.name,
            kind: step.kind,
            arguments: step.arguments,
        });

        run.messages.push({ role: step.kind, content: refusalContent(step.kind) });
    }

    /**
     * Saves the turn, then emits `answering` and `answer`.
     * A save failure ends the prompt with `error` and does not emit `answer`.
     * Stop during the save emits `stopped` and does not emit `answer`.
     */
    private async finishAnswer(run: PromptRun, content: string): Promise<void> {
        if (this.isStopped(run)) {
            this.emitStopped(run);

            return;
        }

        run.phase = 'answering';

        const finishedAt = this.now().toISOString();

        try {
            await this.conversations.appendTurn({
                id: run.conversationId,
                userId: run.userId,
                turn: {
                    turnId: this.createId(),
                    prompt: run.prompt,
                    answer: content,
                    savedAt: finishedAt,
                },
            });
        } catch (error) {
            await this.fail(run, error);

            return;
        }

        if (this.isStopped(run) || !run.wireList || !this.claimTerminal(run, 'answered')) {
            this.emitStopped(run);

            return;
        }

        this.emitter.emit({
            type: constants.events.mcp.answering,
            promptId: run.promptId,
            userId: run.userId,
        });

        const answer: McpAnswerEvent = {
            type: constants.events.mcp.answer,
            promptId: run.promptId,
            userId: run.userId,
            content,
            startedAt: run.startedAt,
            finishedAt,
            domains: toDomains(run.used),
            list: run.wireList,
            messages: run.messages.map(message => ({ ...message })),
        };

        run.terminalEventSent = true;
        this.emitter.emit(answer);
    }

    /**
     * Ends the prompt with `error`. An abort emits `stopped` instead.
     * `error` and `stopped` are the last event for that prompt.
     */
    private async fail(run: PromptRun, error: unknown): Promise<void> {
        if (isAbortError(error) || this.isStopped(run)) {
            this.emitStopped(run);

            return;
        }

        logger.error(`Prompt failed for prompt ${run.promptId}`, { error: error as Error });

        if (!this.claimTerminal(run, 'failed')) {
            if (this.isStopped(run)) {
                this.emitStopped(run);
            }

            return;
        }

        run.terminalEventSent = true;
        this.emitter.emit({
            type: constants.events.mcp.error,
            promptId: run.promptId,
            userId: run.userId,
            context: failureContext(error),
            messages: run.messages.map(message => ({ ...message })),
            ...(run.wireList ? { list: run.wireList } : {}),
        });
    }

    /**
     * Emits one `stopped` event. Later calls do nothing.
     */
    private emitStopped(run: PromptRun): void {
        if (run.terminalEventSent) {
            return;
        }

        if (run.phase !== 'stopped') {
            this.claimTerminal(run, 'stopped');
        }

        run.terminalEventSent = true;
        this.emitter.emit({
            type: constants.events.mcp.stopped,
            promptId: run.promptId,
            userId: run.userId,
            messages: run.messages.map(message => ({ ...message })),
            ...(run.wireList ? { list: run.wireList } : {}),
        });
    }

    /**
     * Resolves the open ask when the body matches it.
     */
    private settle(promptId: string, userId: string, selection: PromptSelection, decision: 'permit' | 'refuse'): void {
        const run = this.requireOwned(promptId, userId);
        const pending = run.pendingPermission;

        if (
            !pending ||
            pending.domain !== selection.domain ||
            pending.name !== selection.name ||
            pending.kind !== selection.kind
        ) {
            throw new BusinessLogicException(ErrorMessage.MCP_PERMISSION_DOES_NOT_MATCH);
        }

        if (decision === 'permit') {
            run.phase = 'calling';
        }

        run.pendingPermission = undefined;
        pending.resolve(decision);
    }

    /**
     * The active run when this user owns it.
     * A finished prompt this user owns has no pending ask.
     */
    private requireOwned(promptId: string, userId: string): PromptRun {
        const run = this.activePrompts.get(promptId);

        if (run) {
            if (run.userId !== userId) {
                throw new ResourceNotFoundException(ErrorMessage.MCP_PROMPT_NOT_FOUND);
            }

            return run;
        }

        const finished = this.finishedPrompts.get(promptId);

        if (finished && finished.userId === userId) {
            throw new BusinessLogicException(ErrorMessage.MCP_PERMISSION_DOES_NOT_MATCH);
        }

        throw new ResourceNotFoundException(ErrorMessage.MCP_PROMPT_NOT_FOUND);
    }

    /**
     * Leaves "being answered" and remembers the owner until the finished-prompt cap drops it.
     *
     * @returns False when the prompt was already terminal
     */
    private claimTerminal(run: PromptRun, phase: 'answered' | 'stopped' | 'failed'): boolean {
        if (!this.isAnswering(run)) {
            return false;
        }

        run.phase = phase;
        run.pendingPermission = undefined;
        this.activePrompts.delete(run.promptId);

        if (this.activePromptByConversation.get(run.conversationId) === run.promptId) {
            this.activePromptByConversation.delete(run.conversationId);
        }

        this.finishedPrompts.set(run.promptId, { userId: run.userId });

        while (this.finishedPrompts.size > this.finishedPromptLimit) {
            const oldest = this.finishedPrompts.keys().next().value;

            if (!oldest) {
                break;
            }

            this.finishedPrompts.delete(oldest);
        }

        return true;
    }

    /**
     * True when stop has already claimed the prompt.
     * Read through a method so a check after an await is not narrowed away.
     * Stop changes the phase while a fetch, a model call, or a save is in flight.
     */
    private isStopped(run: PromptRun): boolean {
        return run.phase === 'stopped';
    }

    /**
     * True while the prompt can still be stopped.
     */
    private isAnswering(run: PromptRun): boolean {
        return (
            run.phase === 'selecting' ||
            run.phase === 'awaitingPermission' ||
            run.phase === 'calling' ||
            run.phase === 'answering'
        );
    }

    /**
     * Records a tool or resource that ran. A repeated name is kept once.
     */
    private recordUse(run: PromptRun, step: Extract<ModelStep, { type: 'selection' }>): void {
        const alreadyUsed = run.used.some(
            item => item.domain === step.domain && item.name === step.name && item.kind === step.kind
        );

        if (!alreadyUsed) {
            run.used.push({ domain: step.domain, name: step.name, kind: step.kind });
        }
    }

    /**
     * The permission event for an open ask, including its arguments.
     */
    private permissionEvent(
        run: PromptRun,
        pending: { domain: string; name: string; kind: PromptSelection['kind']; arguments: Record<string, unknown> }
    ): McpPermissionEvent {
        return {
            type: constants.events.mcp.permission,
            promptId: run.promptId,
            userId: run.userId,
            domain: pending.domain,
            name: pending.name,
            kind: pending.kind,
            arguments: pending.arguments,
        };
    }
}

/**
 * Builds a runner with the given client, gateway, and store.
 * Production uses {@link PromptRunner.getInstance}. Tests call this with fakes.
 *
 * @param dependencies Client, gateway, emitter, and conversation store
 * @returns A runner that is not the process singleton
 */
const createPromptRunner = (dependencies: PromptRunnerDependencies): PromptRunner => PromptRunner.create(dependencies);

/**
 * Conversation access for the process runner.
 * Each call opens a context the way Delegator does, because the loop outlives the HTTP request.
 */
const conversationStore = (): ConversationStore => ({
    async getByIdForUser(id, userId) {
        const dbContext = await openDbContext();

        return dbContext.repository.conversations.getByIdForUser(id, userId);
    },
    async appendTurn(payload) {
        const dbContext = await openDbContext();

        return dbContext.repository.conversations.appendTurn(payload);
    },
});

/**
 * Opens a database context. Each call connects and builds its own repositories.
 */
const openDbContext = async (): Promise<DbContext> => {
    const manager = MongoClientManager.getInstance();
    const db = await manager.connect();

    return new DbContext(db, {
        startSession: () => manager.startSession(),
    });
};

export { createPromptRunner, PromptRunner };
