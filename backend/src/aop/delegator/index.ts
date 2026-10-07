import { Aborter } from 'aop/aborter';
import { MongoClientManager } from 'aop/db/mongo/client';
import { DbContext } from 'aop/db/mongo/context';
import { Emitter } from 'aop/emitter';
import { logger } from 'aop/logging';
import { Scheduler } from 'aop/scheduler';

import config from 'config';
import constants from 'shared/constants';

import type { ToolType } from './tools/types';
import type { DelegationPayload, RunningJob, TargetWithResultsPayload } from './types';
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
 *
 * Realizes:
 * - FR-JOBS-RUN-001 — Execute tools when the job is run (immediate or schedule fire)
 * - FR-JOBS-RUN-002 — Persist execution outcomes
 * - FR-JOBS-STP-003 / FR-JOBS-STP-004 — Cancel skips later tools; persist cancelled executions
 * - FR-JOBS-STR-001 / FR-JOBS-STR-006 — Emit live running / target / finished / failed / cancelled events
 * - NFR-REL-JOBS-002 — AbortSignal flows to tools/targets for cooperative resource teardown
 *
 * Controllers gate concurrent runs via `getRunningJobsForUser` (FR-JOBS-RUN-004).
 */
export class Delegator {
    private static instance: Delegator | null = null;
    private emitter: Emitter = Emitter.getInstance();
    private scheduler: Scheduler = Scheduler.getInstance();
    private pendingJobs = new Map<string, DelegationPayload>();
    public runningJobs = new Map<string, RunningJob>();

    /**
     * Private constructor enforces singleton pattern.
     */
    private constructor() {}

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
     * Requests cancellation of an in-flight job run (FR-JOBS-STP-001 / FR-JOBS-STP-003).
     * Idempotent no-op if the job is not running. Controllers check running state
     * via `getRunningJobsForUser` when they need to distinguish not-running from
     * cancel-requested (FR-JOBS-STP-002).
     *
     * @param jobId Job ID to cancel
     */
    public cancel(jobId: string): void {
        this.runningJobs.get(jobId)?.aborter.cancel();
    }

    /**
     * Returns running jobs owned by the given user.
     *
     * @param userId Owner user id
     * @returns Running jobs for that user
     */
    public getRunningJobsForUser(userId: string): ReadonlyArray<{ jobId: string }> {
        return Array.from(this.runningJobs.entries())
            .filter(([, job]) => job.payload.userId === userId)
            .map(([jobId]) => ({ jobId }));
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
                type: constants.events.jobs.jobTargetFinished,
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
            signal: payload.signal,
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
        const aborter = new Aborter();

        try {
            const delegatedAt = new Date().toISOString();
            let cancelledAt: string | null = null;

            this.runningJobs.set(payload.jobId, { payload, aborter });

            this.emitter.emit({
                type: constants.events.jobs.jobsRunning,
                runningJobs: Array.from(this.runningJobs.keys()),
                userId: payload.userId,
            });

            // Determine mapped tools with targets with results
            const mappedTools: ExecutionTool[] = [];

            for (let toolIndex = 0; toolIndex < payload.tools.length; toolIndex++) {
                // FR-JOBS-STP-003 — Do not start subsequent tools after cancel
                if (aborter.cancelled) {
                    cancelledAt = new Date().toISOString();
                    break;
                }

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
                        cancelledAt: null,
                    },
                    tool,
                    signal: aborter.signal,
                };
                const toolWithMappedTargets = await this.getToolTargetsWithResults(getToolTargetsWithResultsPayload);

                const mappedTool = {
                    ...tool,
                    targets: toolWithMappedTargets,
                } as ExecutionTool;
                mappedTools.push(mappedTool);
            }

            const finishedAt = new Date().toISOString();

            // FR-JOBS-STP-004 — Cancelled runs persist with status cancelled (tools may be empty)
            const status = aborter.cancelled
                ? constants.status.execution.cancelled
                : constants.status.execution.completed;

            const executionPayload: ExecutionPayload = {
                executionId,
                jobId: payload.jobId,
                schedule: {
                    type: payload.scheduleType,
                    delegatedAt,
                    finishedAt,
                    cancelledAt,
                },
                tools: mappedTools,
                status,
            };

            await this.persistResult(executionPayload);

            if (status === constants.status.execution.cancelled && cancelledAt !== null) {
                // FR-JOBS-STR-006 — Live cancellation event
                this.emitter.emit({
                    type: constants.events.jobs.jobCancelled,
                    jobId: payload.jobId,
                    userId: payload.userId,
                    cancelledAt,
                    executionId,
                });
            } else {
                this.emitter.emit({
                    type: constants.events.jobs.jobFinished,
                    jobId: payload.jobId,
                    userId: payload.userId,
                    finishedAt,
                    executionId,
                });
            }
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
            const isRecurringJob = payload.scheduleType && payload.scheduleType !== 'once';

            if (isRecurringJob) {
                // FR-JOBS-STR-003 — Live schedule-attachment event with runtime next/last run
                this.emitter.emit({
                    scheduledJobs: this.scheduler.getCronJobEventsForUser(payload.userId),
                    userId: payload.userId,
                    type: constants.events.jobs.jobsScheduled,
                });
            } else {
                this.pendingJobs.delete(payload.jobId);
            }

            this.runningJobs.delete(payload.jobId);
            this.emitter.clearJobTargetEvents(payload.jobId);
        }
    }

    /**
     * Cancels in-flight work if present, then removes the job from pending/running maps
     * and clears job target events.
     *
     * @param jobId Job ID to remove
     */
    public removeJob(jobId: string): void {
        this.cancel(jobId);
        this.pendingJobs.delete(jobId);
        this.runningJobs.delete(jobId);
        this.emitter.clearJobTargetEvents(jobId);
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
