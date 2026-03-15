import { MongoClientManager } from 'aop/db/mongo/client';
import { DbContext } from 'aop/db/mongo/context';
import { Emitter } from 'aop/emitter';
import { logger } from 'aop/logging';

import config from 'config';
import constants from 'shared/constants';

import type { ToolMap, ToolTarget, ToolType, ToolWithTargetResults } from './tools/types';
import type { DelegationPayload } from './types';
import type { ExecutionPayload } from 'shared/types/jobs';

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
     * Maps tool targets with results by executing the tool and mapping the results.
     *
     * @param tool Tool to execute
     * @returns Tool targets with results
     */
    private async getToolTargetsWithResults<T extends ToolType>(tool: ToolMap[T], jobId: string, userId: string) {
        const mappedToolTargets: ToolTarget[] = [];

        const onTargetFinish = (target: ToolTarget) => {
            const toolTargetWithResults = {
                ...target,
                results: target.results,
            };

            mappedToolTargets.push(toolTargetWithResults);

            this.emitter.emit({
                type: constants.events.jobs.targetFinished,
                jobId,
                userId,
                ...toolTargetWithResults,
            });
        };

        await toolRegistry[tool.type as T].execute({
            tool,
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
        try {
            const delegatedAt = new Date();

            this.runningJobs.set(payload.jobId, payload);

            this.emitter.emit({
                type: constants.events.jobs.runningJobs,
                runningJobs: Array.from(this.runningJobs.keys()),
            });

            const mappedTools: ToolWithTargetResults[] = [];

            for (let toolIndex = 0; toolIndex < payload.tools.length; toolIndex++) {
                const tool = payload.tools[toolIndex];
                const toolWithMappedTargets = await this.getToolTargetsWithResults(tool, payload.jobId, payload.userId);

                const mappedTool = {
                    ...tool,
                    targets: toolWithMappedTargets,
                };

                mappedTools.push(mappedTool);
            }

            const finishedAt = new Date();

            const executionPayload = {
                jobId: payload.jobId,
                schedule: {
                    type: payload.scheduleType,
                    delegatedAt,
                    finishedAt,
                },
                tools: mappedTools,
            };

            await this.persistResult(executionPayload);
        } catch (error) {
            logger.error(`Failed to new delegation for job with ID: ${payload.jobId}`, { error: error as Error });
        } finally {
            this.runningJobs.delete(payload.jobId);
            this.pendingJobs.delete(payload.jobId);
            this.emitter.clearJobTargetEvents(payload.jobId);
            this.emitter.emit({
                type: constants.events.jobs.jobFinished,
                jobId: payload.jobId,
            });
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
