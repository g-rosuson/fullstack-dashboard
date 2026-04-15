import { MongoClientManager } from 'aop/db/mongo/client';
import { DbContext } from 'aop/db/mongo/context';
import { Emitter } from 'aop/emitter';
import { logger } from 'aop/logging';

import config from 'config';
import constants from 'shared/constants';

import type { ToolType } from './tools/types';
import type { DelegationPayload, TargetWithResultsPayload } from './types';
import type {
    ExecutionPayload,
    ExecutionTool,
    ExecutionToolTarget,
} from 'shared/types/jobs/tools/execution/types-execution';

import toolRegistry from './tools';
import { retryWithFixedInterval } from 'utils';

/**
 * Singleton that routes job executions to domain-specific tools.
 * Manages job lifecycle from registration through completion.
 * Maintains queues: pendingJobs (scheduled) and runningJobs (executing).
 */
export class Delegator {
    private static instance: Delegator | null = null;
    private pendingJobs = new Map<string, DelegationPayload>();
    private emitter: Emitter = Emitter.getInstance();
    public runningJobs = new Map<string, DelegationPayload>();

    /**
     * Private constructor enforces singleton pattern.
     * Binds instance methods for correct `this` DelegatorContext.
     */
    private constructor() {
        this.delegate = this.delegate.bind(this);
        this.register = this.register.bind(this);
    }

    /**
     * Returns the singleton instance, creating it if needed.
     */
    static getInstance() {
        if (!Delegator.instance) {
            Delegator.instance = new Delegator();
        }

        return Delegator.instance;
    }

    /**
     * Executes a tool and collects the results of each target.
     *
     * @typeParam T - Discriminant key from `ToolMap` (e.g. `'scraper'` | `'email'`).
     *   Ties `tool` to the correct registry executor — `ToolMap[T]` ensures the concrete
     *   tool type (e.g. `ScraperTool`) is passed to the executor that expects it, preventing
     *   a mismatched tool/executor pair at the call site.
     *
     * @param tool Tool to execute
     * @returns Tool targets with results
     */
    private async getToolTargetsWithResults<T extends ToolType>(payload: TargetWithResultsPayload<T>) {
        const mappedToolTargets: ExecutionToolTarget[] = [];

        const onTargetFinish = (target: ExecutionToolTarget) => {
            mappedToolTargets.push(target);

            this.emitter.emit({
                type: constants.events.jobs.targetFinished,
                jobId: payload.jobId,
                userId: payload.userId,
                executionId: payload.executionId,
                tool: payload.tool,
                schedule: payload.schedule,
                target,
            });
        };

        // `tool.type` is string-widened from the ToolMap[T] constraint — TS can't infer it
        // narrows to exactly T, so we assert to satisfy the registry index signature.
        await toolRegistry[payload.tool.type as T].execute({
            tool: payload.tool,
            onTargetFinish,
        });

        return mappedToolTargets;
    }

    /**
     * Executes a delegation by running all tools sequentially and persisting results.
     * Cleans up job queues in finally block regardless of success or failure.
     *
     * @param payload Delegation payload
     */
    public async delegate(payload: DelegationPayload) {
        const executionId = crypto.randomUUID();

        try {
            const delegatedAt = new Date().toISOString();

            this.runningJobs.set(payload.jobId, payload);

            this.emitter.emit({
                type: constants.events.jobs.runningJobs,
                runningJobs: Array.from(this.runningJobs.keys()),
                userId: payload.userId,
            });

            // Determine mapped tools with targets with results
            const mappedTools: ExecutionTool[] = [];

            for (let toolIndex = 0; toolIndex < payload.tools.length; toolIndex++) {
                const tool = payload.tools[toolIndex];

                // Determine the payload for the getToolTargetsWithResults method
                const getToolTargetsWithResultsPayload: TargetWithResultsPayload<typeof tool.type> = {
                    executionId,
                    jobId: payload.jobId,
                    userId: payload.userId,
                    schedule: {
                        type: payload.scheduleType,
                        delegatedAt,
                        finishedAt: null,
                    },
                    tool,
                };
                const toolWithMappedTargets = await this.getToolTargetsWithResults(getToolTargetsWithResultsPayload);

                const mappedTool = {
                    ...tool,
                    targets: toolWithMappedTargets,
                } as ExecutionTool;
                mappedTools.push(mappedTool);
            }

            const finishedAt = new Date().toISOString();

            const executionPayload: ExecutionPayload = {
                executionId,
                jobId: payload.jobId,
                schedule: {
                    type: payload.scheduleType,
                    delegatedAt,
                    finishedAt,
                },
                tools: mappedTools,
            };

            await this.persistResult(executionPayload);

            this.emitter.emit({
                type: constants.events.jobs.jobFinished,
                jobId: payload.jobId,
                userId: payload.userId,
                finishedAt,
                executionId,
            });
        } catch (error) {
            logger.error(`Failed to new delegation for job with ID: ${payload.jobId} and executionId: ${executionId}`, {
                error: error as Error,
            });
            this.emitter.emit({
                type: constants.events.jobs.jobFailed,
                jobId: payload.jobId,
                userId: payload.userId,
                executionId,
                failedAt: new Date().toISOString(),
            });
        } finally {
            this.runningJobs.delete(payload.jobId);
            this.pendingJobs.delete(payload.jobId);
            this.emitter.clearJobTargetEvents(payload.jobId);
        }
    }

    /**
     * Registers a job in the pending queue for later execution.
     *
     * @param payload Delegation payload
     */
    public register(payload: DelegationPayload) {
        this.pendingJobs.set(payload.jobId, payload);
    }

    /**
     * Retrieves and executes a pending job by ID.
     * Typically called by schedulers (e.g., cron jobs).
     *
     * @param jobId Scheduled job identifier
     */
    public async delegateScheduledJob(jobId: string) {
        const scheduledJob = this.pendingJobs.get(jobId);

        if (!scheduledJob) {
            logger.error(`Cannot find and delegate scheduled job with ID: "${jobId}"`, {});
        } else {
            await this.delegate(scheduledJob);
        }
    }

    /**
     * Persists job results with retry logic for transient database failures.
     * Uses fixed interval retries configured via maxDbRetries and dbRetryDelayMs.
     *
     * @param executionPayload Job execution results to persist
     */
    private async persistResult(executionPayload: ExecutionPayload) {
        try {
            await retryWithFixedInterval(
                async () => {
                    const dbContext = await this.dbContext();
                    await dbContext.repository.jobs.addExecution(executionPayload);
                },
                {
                    maxAttempts: config.maxDbRetries!,
                    delayMs: config.dbRetryDelayMs!,
                    operationName: `persisting job results for jobId: ${executionPayload.jobId}`,
                }
            );

            logger.info(`Successfully persisted job results for jobId: ${executionPayload.jobId}`);
        } catch (error) {
            logger.error(`Failed to persist job results after retries for jobId: ${executionPayload.jobId}`, {
                error: error as Error,
            });
        }
    }

    /**
     * Creates a database context with connection and transaction support.
     * Each call creates a fresh context for scoped database access.
     *
     * @returns DbContext instance
     */
    private async dbContext() {
        const manager = MongoClientManager.getInstance();
        const db = await manager.connect();

        const transaction = {
            startSession: () => manager.startSession(),
        };

        return new DbContext(db, transaction);
    }
}
