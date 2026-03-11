import { ScheduledTask } from 'node-cron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CronJob } from './types';

import { Scheduler } from './';
import parser from 'cron-parser';

// Determine mock values
const invalidCronExpression = 'invalid';
const defaultCronExpression = '0 0 * * *';
const mockDate = new Date('2026-02-12T08:30:00');
const mockDailyCronExpression = '30 8 * * *'; // Matches the mock date above
const mockErrorMsg = 'Error msg';
const mockJobId = 'test-job-id';
const mockJobName = 'test-job-name';
const mockDailyType = 'daily';
const mockOnceType = 'once';
const mockTimeoutLength = 300000;
const mockStartDate = new Date('2026-02-12T08:30:00');
const mockEndDate = new Date('2026-02-12T08:35:00');
const mockDestroy = vi.fn();
const parseMock = vi.hoisted(() => vi.fn());
const infoMock = vi.hoisted(() => vi.fn());
const errorMock = vi.hoisted(() => vi.fn());
const delegateScheduledJobMock = vi.hoisted(() => vi.fn());
const mockStartCronTask = vi.hoisted(() => vi.fn());
const mockStopCronTask = vi.hoisted(() => vi.fn());

// Mock required dependencies
vi.mock('aop/logging', () => ({
    logger: {
        info: infoMock,
        error: errorMock,
    },
}));

vi.mock('cron-parser', () => ({
    default: {
        parse: parseMock,
    },
}));

vi.mock('aop/delegator', () => ({
    Delegator: {
        getInstance: vi.fn(() => ({
            delegateScheduledJob: delegateScheduledJobMock,
        })),
    },
}));

vi.mock('node-cron', () => ({
    default: {
        createTask: vi.fn(() => ({
            start: mockStartCronTask,
            stop: mockStopCronTask,
            destroy: mockDestroy,
        })),
        validate: vi.fn(() => true),
    },
}));

/**
 * Creates a mock cron job with default values and the given overrides.
 * @param cronJob - The cron job overrides.
 * @returns A mock cron job.
 */
const getMockCronJob = (cronJob: Partial<CronJob> = {}) => ({
    jobId: mockJobId,
    cronExpression: defaultCronExpression,
    startDate: new Date(),
    endDate: new Date(),
    cronTask: {
        destroy: mockDestroy,
        start: mockStartCronTask,
    } as unknown as ScheduledTask,
    metadata: {
        startTimeoutId: undefined,
        stopTimeoutId: undefined,
    },
    ...cronJob,
});

describe('Scheduler', () => {
    let scheduler: Scheduler;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        infoMock.mockReset();
        errorMock.mockReset();
        parseMock.mockReset();
        mockDestroy.mockReset();
        delegateScheduledJobMock.mockReset();
        mockStartCronTask.mockReset();

        // Reset the singleton instance for isolated tests
        // @ts-expect-error - accessing private static property for testing
        Scheduler.instance = null;
        scheduler = Scheduler.getInstance();
    });

    describe('getInstance', () => {
        it('should return the same instance on multiple calls', () => {
            const firstInstance = Scheduler.getInstance();
            const secondInstance = Scheduler.getInstance();

            expect(firstInstance).toBe(secondInstance);
        });
    });

    describe('getNextAndPreviousRun', () => {
        it('should log an error if the job is not found', () => {
            scheduler.getNextAndPreviousRun(mockJobId);
            expect(errorMock).toHaveBeenCalled();
        });

        it('should return null for next and previous run if the cron job is not found', () => {
            const nextAndPreviousRun = scheduler.getNextAndPreviousRun(mockJobId);
            expect(nextAndPreviousRun).toEqual({
                nextRun: null,
                previousRun: null,
            });
        });

        it('should return null for next and previous run if the cron job has an invalid cron expression', () => {
            const mockCronJob = getMockCronJob({ cronExpression: invalidCronExpression });

            scheduler.cronJobs.set(mockJobId, mockCronJob);
            const nextAndPreviousRun = scheduler.getNextAndPreviousRun(mockJobId);
            expect(nextAndPreviousRun).toEqual({
                nextRun: null,
                previousRun: null,
            });
        });

        it('should throw an error if the cron expression is invalid', () => {
            const mockCronJob = getMockCronJob({ cronExpression: invalidCronExpression });

            scheduler.cronJobs.set(mockJobId, mockCronJob);
            const result = scheduler.getNextAndPreviousRun(mockJobId);

            expect(result).toEqual({
                nextRun: null,
                previousRun: null,
            });

            expect(errorMock).toHaveBeenCalled();
        });

        it('should determine nextRun date when .next() throws an error', () => {
            // Determine nextInterval
            parseMock.mockImplementationOnce(() => ({
                next: () => ({ toDate: () => mockDate }),
            }));

            // Determine prevInterval
            parseMock.mockImplementationOnce(() => ({
                prev: () => {
                    throw new Error(mockErrorMsg);
                },
            }));

            scheduler.cronJobs.set(mockJobId, getMockCronJob());
            const result = scheduler.getNextAndPreviousRun(mockJobId);

            expect(result.nextRun).toEqual(mockDate);
            expect(result.previousRun).toBeNull();
            expect(errorMock).toHaveBeenCalled();
        });

        it('should determine previousRun date when .prev() throws an error', () => {
            // Determine nextInterval
            parseMock.mockImplementationOnce(() => ({
                next: () => {
                    throw new Error(mockErrorMsg);
                },
            }));

            // Determine prevInterval
            parseMock.mockImplementationOnce(() => ({
                prev: () => ({ toDate: () => mockDate }),
            }));

            scheduler.cronJobs.set(mockJobId, getMockCronJob());
            const result = scheduler.getNextAndPreviousRun(mockJobId);

            expect(result.nextRun).toBeNull();
            expect(result.previousRun).toEqual(mockDate);
            expect(errorMock).toHaveBeenCalled();
        });

        it('should return nulls when both next() and prev() throw', () => {
            parseMock.mockImplementation(() => ({
                next: () => {
                    throw new Error(mockErrorMsg);
                },
                prev: () => {
                    throw new Error(mockErrorMsg);
                },
            }));

            scheduler.cronJobs.set(mockJobId, getMockCronJob());

            const result = scheduler.getNextAndPreviousRun(mockJobId);

            expect(result).toEqual({
                nextRun: null,
                previousRun: null,
            });

            expect(errorMock).toHaveBeenCalledTimes(2);
        });

        it('should handle startDate > endDate', () => {
            const startDateAfterEndDate = new Date('2026-02-10');
            const endDateBeforeStartDate = new Date('2026-02-01');

            parseMock.mockImplementation(() => {
                throw new Error(mockErrorMsg);
            });

            scheduler.cronJobs.set(mockJobId, {
                ...getMockCronJob(),
                startDate: startDateAfterEndDate,
                endDate: endDateBeforeStartDate,
            });
            const result = scheduler.getNextAndPreviousRun(mockJobId);

            expect(result).toEqual({
                nextRun: null,
                previousRun: null,
            });

            expect(errorMock).toHaveBeenCalled();
        });

        describe('should use the correct current date for the next interval currentDate property', () => {
            it('should use the current time if the start date is in the past', () => {
                const now = new Date();
                const startDate = new Date(now.getTime() - 1000);
                const endDate = new Date(now.getTime() + 10000);
                const mockCronJob = getMockCronJob({ startDate, endDate });

                scheduler.cronJobs.set(mockJobId, mockCronJob);
                scheduler.getNextAndPreviousRun(mockJobId);

                expect(parser.parse).toHaveBeenCalledWith(defaultCronExpression, {
                    currentDate: now,
                    endDate: endDate,
                });
            });

            it('should use the cron job start date if its in the future', () => {
                const now = new Date();
                const startDate = new Date(now.getTime() + 1000);
                const endDate = new Date(now.getTime() + 10000);
                const mockCronJob = getMockCronJob({ startDate, endDate });

                scheduler.cronJobs.set(mockJobId, mockCronJob);
                scheduler.getNextAndPreviousRun(mockJobId);

                expect(parser.parse).toHaveBeenCalledWith(defaultCronExpression, {
                    currentDate: startDate,
                    endDate: endDate,
                });
            });
        });

        describe('should use the correct current date for the previous interval currentDate property', () => {
            it('should use the current time and cron job start date', () => {
                const now = new Date();
                const startDate = new Date(now.getTime() - 1000);
                const endDate = new Date(now.getTime() + 10000);
                const mockCronJob = getMockCronJob({ startDate, endDate });

                scheduler.cronJobs.set(mockJobId, mockCronJob);
                scheduler.getNextAndPreviousRun(mockJobId);

                expect(parser.parse).toHaveBeenCalledWith(defaultCronExpression, {
                    currentDate: now,
                    startDate,
                });
            });
        });
    });

    describe('schedule', () => {
        it('should schedule a job idempotently', () => {
            const oldJob = getMockCronJob();
            scheduler.cronJobs.set(mockJobId, oldJob);

            scheduler.schedule({
                jobId: mockJobId,
                name: mockJobName,
                startDate: mockDate,
                endDate: mockDate,
                type: mockDailyType,
            });

            const newJob = scheduler.cronJobs.get(mockJobId);

            expect(mockDestroy).toHaveBeenCalledTimes(1);

            expect(newJob).toBeDefined();
            expect(newJob).not.toBe(oldJob);
        });

        describe('cron task creation', () => {
            it('should create a cron task for recurring jobs', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockDate,
                    endDate: mockDate,
                    type: mockDailyType,
                });

                const job = scheduler.cronJobs.get(mockJobId);

                expect(job).toEqual(
                    expect.objectContaining({
                        cronTask: expect.any(Object),
                        cronExpression: mockDailyCronExpression,
                    })
                );
            });

            it('should not create a cron task with a cron expression for once jobs', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockDate,
                    endDate: mockDate,
                    type: mockOnceType,
                });

                const job = scheduler.cronJobs.get(mockJobId);

                expect(job).toEqual(
                    expect.objectContaining({
                        cronTask: undefined,
                        cronExpression: undefined,
                    })
                );
            });
        });

        describe('start timeout creation', () => {
            it('should create a start timeout for all cron jobs', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockDate,
                    endDate: mockDate,
                    type: mockDailyType,
                });

                const job = scheduler.cronJobs.get(mockJobId);

                expect(job).toEqual(
                    expect.objectContaining({
                        metadata: expect.objectContaining({
                            startTimeoutId: expect.any(Object),
                        }),
                    })
                );
            });

            it('starts cron task after first execution', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockDailyType,
                });

                vi.advanceTimersByTime(mockTimeoutLength);

                expect(mockStartCronTask).toHaveBeenCalled();
            });

            it('should handle "once" cron jobs when start timeout is triggered', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockOnceType,
                });

                vi.advanceTimersByTime(mockTimeoutLength);

                expect(delegateScheduledJobMock).toHaveBeenCalledWith(mockJobId);
                const job = scheduler.cronJobs.get(mockJobId);

                expect(job).toBeUndefined();
            });

            it('should handle recurring cron jobs when start timeout is triggered', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockDailyType,
                });

                vi.advanceTimersByTime(mockTimeoutLength);

                expect(delegateScheduledJobMock).toHaveBeenCalledWith(mockJobId);
                const job = scheduler.cronJobs.get(mockJobId);

                expect(job).toBeDefined();
                expect(mockStartCronTask).toHaveBeenCalled();
            });
        });

        describe('stop timeout creation', () => {
            it('schedules stop timeout for recurring jobs with endDate', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockDailyType,
                });

                const job = scheduler.cronJobs.get(mockJobId);

                expect(job?.metadata.stopTimeoutId).toBeDefined();
            });

            it('does not create a cron task for once jobs', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockOnceType,
                });

                const job = scheduler.cronJobs.get(mockJobId);

                expect(job?.cronTask).toBeUndefined();
            });

            it('should not run when an end date is not defined', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: null,
                    type: mockDailyType,
                });

                vi.advanceTimersByTime(mockTimeoutLength);
                const job = scheduler.cronJobs.get(mockJobId);
                expect(job?.metadata).toEqual(
                    expect.objectContaining({
                        stopTimeoutId: undefined,
                    })
                );
            });

            it('should not run when the cron job is of type "once"', () => {
                scheduler.schedule({
                    jobId: mockJobId,
                    name: mockJobName,
                    startDate: mockStartDate,
                    endDate: mockEndDate,
                    type: mockOnceType,
                });

                vi.advanceTimersByTime(mockTimeoutLength);
                const job = scheduler.cronJobs.get(mockJobId);
                expect(job).toBeUndefined();
            });
        });
    });
});
