import constants from 'shared/constants';

import { ToolTargetName, ToolType } from './tools/types';

import { Delegator } from './';

const mockTool = {
    type: 'tool' as ToolType,
    keywords: ['keyword-1', 'keyword-2'],
    maxPages: 1,
    targets: [{ targetId: 'target-1', target: 'target' as unknown as ToolTargetName }],
    testId: 'test-id-1',
};
const mockToolTwo = {
    type: 'tool' as ToolType,
    keywords: ['keyword-3', 'keyword-4'],
    maxPages: 1,
    targets: [{ targetId: 'target-2', target: 'target' as unknown as ToolTargetName }],
    testId: 'test-id-2',
};
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
                        delegatedAt: expect.any(Date),
                        finishedAt: expect.any(Date),
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

            for (const targetResult of mockTargetResults) {
                expect(mockEmit).toHaveBeenCalledWith({
                    jobId: 'test-job-id',
                    userId: 'test-user-id',
                    target: targetResult.target,
                    targetId: targetResult.targetId,
                    results: targetResult.results,
                    type: constants.events.jobs.targetFinished,
                });
            }
        });

        it('should emit job finished event correctly', async () => {
            await delegator.delegate(mockPayloadWithTool);

            expect(mockEmit).toHaveBeenCalledWith({
                type: constants.events.jobs.jobFinished,
                jobId: 'test-job-id',
            });
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
        });

        it('should log persistence failures without throwing', async () => {
            mockExecute.mockReset();
            mockAddExecution.mockRejectedValue(new Error('db write failed'));

            await expect(delegator.delegate(mockPayloadWithTool)).resolves.toBeUndefined();

            expect(mockLoggerError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to persist job results'),
                expect.objectContaining({ error: expect.any(Error) })
            );
        });
    });
});
