import constants from 'shared/constants';

import type { Tool } from 'shared/types/jobs/tools/types-tools';
import type { ToolTargetName, ToolType } from 'shared/types/jobs/tools/types-tools';

import { Delegator } from './';

const mockTool = {
    type: 'tool' as ToolType,
    keywords: ['keyword-1', 'keyword-2'],
    maxPages: 1,
    targets: [{ targetId: 'target-1', target: 'target' as unknown as ToolTargetName }],
    testId: 'test-id-1',
    toolId: 'tool-id-1',
} as Tool & { testId: string };
const mockToolTwo = {
    type: 'tool' as ToolType,
    keywords: ['keyword-3', 'keyword-4'],
    maxPages: 1,
    targets: [{ targetId: 'target-2', target: 'target' as unknown as ToolTargetName }],
    testId: 'test-id-2',
} as Tool & { testId: string };
const mockPayloadWithTool = {
    jobId: 'test-job-id',
    userId: 'test-user-id',
    name: 'Test Job',
    tools: [mockTool, mockToolTwo],
    scheduleType: null,
};

vi.mock('aop/db/mongo/client', () => ({
    MongoClientManager: {
        getInstance: vi.fn(() => ({
            connect: vi.fn().mockResolvedValue({}),
            startSession: vi.fn(),
        })),
    },
}));

const mockAddExecution = vi.fn();
vi.mock('aop/db/mongo/context', () => ({
    DbContext: vi.fn().mockImplementation(() => ({
        repository: { jobs: { addExecution: mockAddExecution } },
    })),
}));

const mockEmit = vi.fn();
const mockClearJobTargetEvents = vi.fn();
vi.mock('aop/emitter', () => ({
    Emitter: {
        getInstance: vi.fn(() => ({
            emit: mockEmit,
            clearJobTargetEvents: mockClearJobTargetEvents,
        })),
    },
}));

const mockLoggerError = vi.hoisted(() => vi.fn());
vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: mockLoggerError,
    },
}));

vi.mock('config', () => ({
    default: {
        maxDbRetries: 1,
        dbRetryDelayMs: 0,
    },
}));

const mockExecute = vi.hoisted(() => vi.fn());
const mockProcessRequest = vi.hoisted(() => vi.fn());
vi.mock('./tools', () => ({
    default: {
        tool: {
            execute: mockExecute,
        },
    },
}));

vi.mock('./tools/scraper', () => ({
    default: {
        tool: {
            target: {
                processRequest: mockProcessRequest,
            },
        },
    },
}));

describe('Delegator', () => {
    let delegator: Delegator;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the singleton instance for isolated tests
        // @ts-expect-error - accessing private static property for testing
        Delegator.instance = null;
        delegator = Delegator.getInstance();
    });

    describe('getInstance', () => {
        it('should return the same instance', () => {
            const firstInstance = Delegator.getInstance();
            const secondInstance = Delegator.getInstance();

            expect(firstInstance).toBe(secondInstance);
        });
    });

    describe('delegate', () => {
        it('should add job to running-jobs queue', async () => {
            mockExecute.mockImplementation(async () => {
                expect(delegator.runningJobs.has(mockPayloadWithTool.jobId)).toBe(true);
            });

            await delegator.delegate(mockPayloadWithTool);
        });

        it('should remove job from running-jobs queue', async () => {
            await delegator.delegate(mockPayloadWithTool);
            expect(delegator.runningJobs.has(mockPayloadWithTool.jobId)).toBe(false);
        });

        it('should invoke tools sequentially', async () => {
            const callQueue: string[] = [];

            mockExecute.mockImplementation(async ({ tool }: { tool: typeof mockTool }) => {
                callQueue.push(`${tool.testId}-start`);
                await new Promise(resolve => setTimeout(resolve, 10));
                callQueue.push(`${tool.testId}-end`);
            });

            await delegator.delegate(mockPayloadWithTool);

            expect(mockExecute).toHaveBeenCalledTimes(2);

            expect(callQueue).toEqual(['test-id-1-start', 'test-id-1-end', 'test-id-2-start', 'test-id-2-end']);
        });

        it('should persist execution payload with correct shape', async () => {
            await delegator.delegate(mockPayloadWithTool);

            expect(mockAddExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    jobId: 'test-job-id',
                    schedule: {
                        type: null,
                        delegatedAt: expect.any(String),
                        finishedAt: expect.any(String),
                    },
                    tools: [
                        expect.objectContaining({
                            type: 'tool',
                            keywords: ['keyword-1', 'keyword-2'],
                            targets: [],
                        }),
                        expect.objectContaining({
                            type: 'tool',
                            keywords: ['keyword-3', 'keyword-4'],
                            targets: [],
                        }),
                    ],
                })
            );
        });

        it('should emit events in the correct order', async () => {
            const mockTargetResults = [
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-1',
                    results: [{ result: { url: 'https://example.com/a', title: 'A' }, error: null }],
                },
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-2',
                    results: [{ result: { url: 'https://example.com/b', title: 'B' }, error: null }],
                },
            ];

            for (const targetResult of mockTargetResults) {
                mockExecute.mockImplementationOnce(
                    // eslint-disable-next-line no-unused-vars
                    async ({ onTargetFinish }: { onTargetFinish: (target: typeof targetResult) => void }) => {
                        onTargetFinish(targetResult);
                    }
                );
            }

            await delegator.delegate(mockPayloadWithTool);

            const emittedTypes = mockEmit.mock.calls.map(([payload]) => payload.type);

            expect(emittedTypes).toEqual([
                constants.events.jobs.runningJobs,
                constants.events.jobs.targetFinished,
                constants.events.jobs.targetFinished,
                constants.events.jobs.jobFinished,
            ]);
        });

        it('should emit target-finished event for each completed target', async () => {
            const mockTargetResults = [
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-1',
                    results: [
                        {
                            result: {
                                url: 'https://example.com/job-1',
                                title: 'Software Engineer',
                            },
                            error: null,
                        },
                    ],
                },
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-2',
                    results: [
                        {
                            result: {
                                url: 'https://example.com/job-2',
                                title: 'Data Engineer',
                            },
                            error: null,
                        },
                    ],
                },
            ];

            for (const targetResult of mockTargetResults) {
                mockExecute.mockImplementationOnce(
                    // eslint-disable-next-line no-unused-vars
                    async ({ onTargetFinish }: { onTargetFinish: (target: typeof targetResult) => void }) => {
                        onTargetFinish(targetResult);
                    }
                );
            }

            await delegator.delegate(mockPayloadWithTool);

            // Since a running-jobs event is emitted before the target-finished events,
            // we need to filter out the running-jobs event
            const targetFinishedPayloads = mockEmit.mock.calls
                .map(([payload]) => payload as { type: string })
                .filter(p => p.type === constants.events.jobs.targetFinished);

            expect(targetFinishedPayloads).toHaveLength(2);

            expect(targetFinishedPayloads[0]).toEqual(
                expect.objectContaining({
                    jobId: 'test-job-id',
                    userId: 'test-user-id',
                    executionId: expect.any(String),
                    schedule: {
                        type: null,
                        delegatedAt: expect.any(String),
                        finishedAt: null,
                    },
                    tool: mockTool,
                    target: mockTargetResults[0],
                    type: constants.events.jobs.targetFinished,
                })
            );

            expect(targetFinishedPayloads[1]).toEqual(
                expect.objectContaining({
                    jobId: 'test-job-id',
                    userId: 'test-user-id',
                    executionId: expect.any(String),
                    schedule: {
                        type: null,
                        delegatedAt: expect.any(String),
                        finishedAt: null,
                    },
                    tool: mockToolTwo,
                    target: mockTargetResults[1],
                    type: constants.events.jobs.targetFinished,
                })
            );
        });

        it('should emit job finished event correctly', async () => {
            await delegator.delegate(mockPayloadWithTool);

            expect(mockEmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: constants.events.jobs.jobFinished,
                    jobId: 'test-job-id',
                    userId: 'test-user-id',
                    executionId: expect.any(String),
                    finishedAt: expect.any(String),
                })
            );

            const jobFailedEmitted = mockEmit.mock.calls.some(
                ([payload]) => payload.type === constants.events.jobs.jobFailed
            );
            expect(jobFailedEmitted).toBe(false);
        });

        it('should use the same execution id on all success events for one run', async () => {
            const mockTargetResults = [
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-1',
                    results: [{ result: { url: 'https://example.com/a', title: 'A' }, error: null }],
                },
                {
                    target: 'jobs-ch' as const,
                    targetId: 'target-2',
                    results: [{ result: { url: 'https://example.com/b', title: 'B' }, error: null }],
                },
            ];

            for (const targetResult of mockTargetResults) {
                mockExecute.mockImplementationOnce(
                    // eslint-disable-next-line no-unused-vars
                    async ({ onTargetFinish }: { onTargetFinish: (target: typeof targetResult) => void }) => {
                        onTargetFinish(targetResult);
                    }
                );
            }

            await delegator.delegate(mockPayloadWithTool);

            const payloads = mockEmit.mock.calls.map(([p]) => p as { type: string; executionId?: string });

            const jobFinished = payloads.find(p => p.type === constants.events.jobs.jobFinished);
            const targetFinished = payloads.filter(p => p.type === constants.events.jobs.targetFinished);

            expect(jobFinished?.executionId).toEqual(expect.any(String));
            expect(targetFinished).toHaveLength(2);
            for (const p of targetFinished) {
                expect(p.executionId).toBe(jobFinished?.executionId);
            }
        });

        it('should persist targets populated by onTargetFinish', async () => {
            const mockTargetResult = {
                target: 'jobs-ch' as const,
                targetId: 'target-1',
                results: [
                    {
                        result: {
                            url: 'https://example.com/job-1',
                            title: 'Software Engineer',
                            description: [{ blocks: ['Great job'] }],
                            information: [{ label: 'Location', value: 'Zurich' }],
                        },
                        error: null,
                    },
                ],
            };

            mockExecute.mockImplementation(
                // eslint-disable-next-line no-unused-vars
                async ({ onTargetFinish }: { onTargetFinish: (target: typeof mockTargetResult) => void }) => {
                    onTargetFinish(mockTargetResult);
                }
            );

            await delegator.delegate(mockPayloadWithTool);

            expect(mockAddExecution).toHaveBeenCalledWith(
                expect.objectContaining({
                    tools: [
                        expect.objectContaining({
                            targets: [
                                expect.objectContaining({
                                    target: 'jobs-ch',
                                    targetId: 'target-1',
                                    results: [
                                        expect.objectContaining({
                                            result: expect.objectContaining({
                                                url: 'https://example.com/job-1',
                                                title: 'Software Engineer',
                                            }),
                                            error: null,
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        expect.objectContaining({
                            targets: [
                                expect.objectContaining({
                                    target: 'jobs-ch',
                                    targetId: 'target-1',
                                    results: expect.any(Array),
                                }),
                            ],
                        }),
                    ],
                })
            );
        });

        it('should clear emitter job target events after delegation', async () => {
            await delegator.delegate(mockPayloadWithTool);

            expect(mockClearJobTargetEvents).toHaveBeenCalledWith('test-job-id');
            expect(mockClearJobTargetEvents).toHaveBeenCalledTimes(1);
        });

        it('should clean up queues and emitter even when tool execution fails', async () => {
            mockExecute.mockRejectedValue(new Error('tool exploded'));

            await delegator.delegate(mockPayloadWithTool);

            expect(delegator.runningJobs.has('test-job-id')).toBe(false);
            expect(mockClearJobTargetEvents).toHaveBeenCalledWith('test-job-id');

            const emittedTypes = mockEmit.mock.calls.map(([payload]) => payload.type);

            expect(emittedTypes).toEqual([constants.events.jobs.runningJobs, constants.events.jobs.jobFailed]);

            const jobFinishedEmitted = mockEmit.mock.calls.some(
                ([payload]) => payload.type === constants.events.jobs.jobFinished
            );
            expect(jobFinishedEmitted).toBe(false);

            const targetFinishedCount = mockEmit.mock.calls.filter(
                ([payload]) => payload.type === constants.events.jobs.targetFinished
            ).length;
            expect(targetFinishedCount).toBe(0);

            expect(mockEmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: constants.events.jobs.jobFailed,
                    jobId: 'test-job-id',
                    userId: 'test-user-id',
                    executionId: expect.any(String),
                    failedAt: expect.any(String),
                })
            );

            const jobFailedPayload = mockEmit.mock.calls
                .map(([p]) => p as { type: string; jobId: string; executionId: string })
                .find(p => p.type === constants.events.jobs.jobFailed);
            expect(jobFailedPayload).toBeDefined();

            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ error: expect.any(Error) })
            );
            const [delegationFailureMessage] = mockLoggerError.mock.calls[0];
            expect(delegationFailureMessage).toContain(jobFailedPayload!.jobId);
            expect(delegationFailureMessage).toContain(jobFailedPayload!.executionId);
        });

        it('should log persistence failures without throwing', async () => {
            mockExecute.mockReset();
            mockAddExecution.mockRejectedValue(new Error('db write failed'));

            await expect(delegator.delegate(mockPayloadWithTool)).resolves.toBeUndefined();

            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist job results'),
                expect.objectContaining({ error: expect.any(Error) })
            );

            expect(delegator.runningJobs.has('test-job-id')).toBe(false);
            expect(mockClearJobTargetEvents).toHaveBeenCalledWith('test-job-id');

            const jobFailedEmitted = mockEmit.mock.calls.some(
                ([payload]) => payload.type === constants.events.jobs.jobFailed
            );
            expect(jobFailedEmitted).toBe(false);
        });
    });

    describe('delegateScheduledJob', () => {
        it('should execute work for a job that was registered for later', async () => {
            delegator.register(mockPayloadWithTool);

            await delegator.delegateScheduledJob('test-job-id');

            expect(mockExecute).toHaveBeenCalled();
            expect(mockAddExecution).toHaveBeenCalled();
        });

        it('should not execute again after that job has already run', async () => {
            delegator.register(mockPayloadWithTool);
            await delegator.delegateScheduledJob('test-job-id');

            mockExecute.mockClear();
            mockAddExecution.mockClear();
            mockLoggerError.mockClear();

            await delegator.delegateScheduledJob('test-job-id');

            expect(mockExecute).not.toHaveBeenCalled();
            expect(mockAddExecution).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Cannot find and delegate scheduled job with ID: "test-job-id"'),
                {}
            );
        });

        it('should report when no registered job exists for the id', async () => {
            await delegator.delegateScheduledJob('unknown-job-id');

            expect(mockExecute).not.toHaveBeenCalled();
            expect(mockAddExecution).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Cannot find and delegate scheduled job with ID: "unknown-job-id"'),
                {}
            );
        });
    });

    describe('register combined with immediate delegate', () => {
        it('should leave no scheduled work after the same job is run immediately', async () => {
            delegator.register(mockPayloadWithTool);
            await delegator.delegate(mockPayloadWithTool);

            mockExecute.mockClear();
            mockAddExecution.mockClear();
            mockLoggerError.mockClear();

            await delegator.delegateScheduledJob('test-job-id');

            expect(mockExecute).not.toHaveBeenCalled();
            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Cannot find and delegate scheduled job with ID: "test-job-id"'),
                {}
            );
        });
    });
});
