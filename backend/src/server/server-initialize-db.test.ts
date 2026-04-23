/**
 * Unit tests for {@link initializeDatabase}.
 *
 * Mocks all I/O boundaries (Mongo, `DbContext`, Scheduler, Delegator, `config`, `logger`).
 * Uses the real {@link retryWithFixedInterval}; fake timers + `setSystemTime` support deterministic
 * job `startDate` / `endDate` comparisons (retry behavior is covered in `utils-async-retry` tests).
 *
 * Case IDs: **A1–A3** startup and empty repository; **B4–E11** map to the job-reschedule test plan
 * (filters, future start, past recurring / once, mixed batch).
 *
 * Primary assertions: **`schedule` / `register`** payloads and counts, plus minimal startup contracts
 * (`connect`, `getAll(0, 0)`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Job } from 'shared/types/jobs';

import { initializeDatabase } from './server-initialize-db';

/** Mutable config surface read by the mocked `config` module (used by `retryWithFixedInterval`). */
const configForTests = vi.hoisted(() => ({
    mongoURI: 'mongodb://localhost/test',
    mongoDBName: 'test-db',
    maxDbRetries: 3,
    dbRetryDelayMs: 50,
}));

/** `MongoClientManager.getInstance` → `{ connect, startSession }` (see `server-initialize-db.ts`). */
const { mockConnect, mockMongoGetInstance } = vi.hoisted(() => {
    const mockConnect = vi.fn();
    const mockMongoGetInstance = vi.fn(() => ({
        connect: mockConnect,
        startSession: vi.fn(),
    }));
    return { mockConnect, mockMongoGetInstance };
});

/** Stand-in for `DbContext`: only `repository.jobs.getAll(0, 0)` is exercised. */
const { mockGetAll, MockDbContext } = vi.hoisted(() => {
    const mockGetAll = vi.fn();
    const MockDbContext = vi.fn(function MockDbContextConstructor() {
        return {
            repository: {
                jobs: {
                    getAll: mockGetAll,
                },
            },
        };
    });
    return { mockGetAll, MockDbContext };
});

/** Scheduler singleton: `schedule` and cold-start next run helper used after restart. */
const { mockSchedule, mockGetNextRunFromPersistedSchedule, mockSchedulerGetInstance } = vi.hoisted(() => {
    const mockSchedule = vi.fn();
    const mockGetNextRunFromPersistedSchedule = vi.fn();
    const mockSchedulerGetInstance = vi.fn(() => ({
        schedule: mockSchedule,
        getNextRunFromPersistedSchedule: mockGetNextRunFromPersistedSchedule,
    }));
    return { mockSchedule, mockGetNextRunFromPersistedSchedule, mockSchedulerGetInstance };
});

/** Delegator singleton: `register` pairs with every successful `schedule`. */
const { mockRegister, mockDelegatorGetInstance } = vi.hoisted(() => {
    const mockRegister = vi.fn();
    const mockDelegatorGetInstance = vi.fn(() => ({
        register: mockRegister,
    }));
    return { mockRegister, mockDelegatorGetInstance };
});

/** Default export getters so `initializeDatabase` reads live `configForTests` values. */
vi.mock('config', () => ({
    default: {
        get mongoURI() {
            return configForTests.mongoURI;
        },
        get mongoDBName() {
            return configForTests.mongoDBName;
        },
        get maxDbRetries() {
            return configForTests.maxDbRetries;
        },
        get dbRetryDelayMs() {
            return configForTests.dbRetryDelayMs;
        },
    },
}));

vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('aop/db/mongo/client', () => ({
    MongoClientManager: {
        getInstance: mockMongoGetInstance,
    },
}));

vi.mock('aop/db/mongo/context', () => ({
    DbContext: MockDbContext,
}));

vi.mock('aop/scheduler', () => ({
    Scheduler: {
        getInstance: mockSchedulerGetInstance,
    },
}));

vi.mock('aop/delegator', () => ({
    Delegator: {
        getInstance: mockDelegatorGetInstance,
    },
}));

/** Wall clock for all `startDate` / `endDate` comparisons in this file (`vi.setSystemTime`). */
const FIXED_NOW = new Date('2026-06-15T12:00:00.000Z');

/** Minimal valid `Job['tools']` so `register` expectations stay stable. */
const minimalTools: Job['tools'] = [
    {
        type: 'scraper',
        toolId: 'tool-1',
        keywords: ['typescript'],
        maxPages: 5,
        targets: [
            {
                targetId: 'target-1',
                target: 'jobs-ch',
                keywords: ['remote'],
                maxPages: 2,
            },
        ],
    },
];

/**
 * Builds a {@link Job} for repository fixtures. Required: `id`, `name`, `userId`.
 * Defaults match schema shape; override `schedule` / `tools` per test.
 */
const baseJob = (overrides: Partial<Job> & Pick<Job, 'id' | 'name' | 'userId'>): Job => ({
    schedule: null,
    tools: minimalTools,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: null,
    ...overrides,
});

describe('initializeDatabase', () => {
    const fakeDb = { kind: 'fake-db' } as const;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);

        configForTests.maxDbRetries = 3;
        configForTests.dbRetryDelayMs = 50;

        mockConnect.mockResolvedValue(fakeDb);
        mockGetAll.mockResolvedValue([]);
        // Recurring past-branch tests override when they need a concrete next run.
        mockGetNextRunFromPersistedSchedule.mockReturnValue(null);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Database connection (A1)', () => {
        it('invokes connect on the manager returned from MongoClientManager.getInstance (A1)', async () => {
            await initializeDatabase();

            expect(mockConnect).toHaveBeenCalled();
        });
    });

    describe('Persisted jobs: empty repository (A2–A3)', () => {
        it('does not schedule or register when getAll returns no jobs (A2)', async () => {
            mockGetAll.mockResolvedValue([]);

            await expect(initializeDatabase()).resolves.toBeUndefined();

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
        });
    });

    describe('Persisted jobs: filters and future start (B4–C7)', () => {
        it('skips jobs without schedule (B4)', async () => {
            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'no-schedule',
                    userId: 'u1',
                    name: 'No schedule',
                    schedule: null,
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('skips expired jobs when endDate is strictly before now (B5)', async () => {
            // `endDate` before FIXED_NOW; `endDate === now` would not count as expired in production.
            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'expired',
                    userId: 'u1',
                    name: 'Expired',
                    schedule: {
                        type: 'daily',
                        startDate: '2026-01-01T08:00:00.000Z',
                        endDate: '2026-06-10T12:00:00.000Z',
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('schedules recurring job with future start and null endDate; register matches schedule payload (B6, C7)', async () => {
            const futureStart = '2026-06-20T08:30:00.000Z';
            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'future-daily',
                    userId: 'user-42',
                    name: 'Daily report',
                    schedule: {
                        type: 'daily',
                        startDate: futureStart,
                        endDate: null,
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).toHaveBeenCalledTimes(1);
            expect(mockSchedule).toHaveBeenCalledWith({
                jobId: 'future-daily',
                name: 'Daily report',
                type: 'daily',
                startDate: futureStart,
                endDate: null,
            });

            expect(mockRegister).toHaveBeenCalledTimes(1);
            expect(mockRegister).toHaveBeenCalledWith({
                userId: 'user-42',
                jobId: 'future-daily',
                name: 'Daily report',
                tools: minimalTools,
                scheduleType: 'daily',
            });
        });
    });

    describe('Persisted jobs: past start and recurring (D8–D10)', () => {
        it('does not schedule or register once jobs with a past start (cold boot; D8)', async () => {
            // Product rule: `once` is not auto-rescheduled; user retriggers explicitly.
            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'once-past',
                    userId: 'u1',
                    name: 'Once past',
                    schedule: {
                        type: 'once',
                        startDate: '2026-06-01T08:00:00.000Z',
                        endDate: null,
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
        });

        it('schedules recurring job at nextRun ISO when start is in the past and a next run exists (D9)', async () => {
            const nextRun = new Date('2026-06-16T08:30:00.000Z');
            mockGetNextRunFromPersistedSchedule.mockReturnValue(nextRun);

            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'daily-past',
                    userId: 'u1',
                    name: 'Past anchor',
                    schedule: {
                        type: 'daily',
                        startDate: '2026-06-01T08:30:00.000Z',
                        endDate: '2026-12-31T23:59:59.000Z',
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).toHaveBeenCalledWith({
                jobId: 'daily-past',
                name: 'Past anchor',
                type: 'daily',
                startDate: nextRun.toISOString(),
                endDate: '2026-12-31T23:59:59.000Z',
            });
            expect(mockRegister).toHaveBeenCalledTimes(1);
        });

        it('does not schedule or register recurring job when no next run exists (D10)', async () => {
            mockGetNextRunFromPersistedSchedule.mockReturnValue(null);

            mockGetAll.mockResolvedValue([
                baseJob({
                    id: 'weekly-no-next',
                    userId: 'u1',
                    name: 'No next',
                    schedule: {
                        type: 'weekly',
                        startDate: '2026-06-01T09:00:00.000Z',
                        endDate: null,
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).not.toHaveBeenCalled();
            expect(mockRegister).not.toHaveBeenCalled();
        });
    });

    describe('Persisted jobs: mixed batch (E11)', () => {
        it('applies each business rule independently in one batch', async () => {
            const nextRun = new Date('2026-06-18T10:00:00.000Z');
            mockGetNextRunFromPersistedSchedule.mockReturnValue(nextRun);

            const futureStart = '2026-06-20T08:00:00.000Z';

            // Order: skip, skip, future (schedule+register), once skip, recurring past (getNext + schedule+register).
            mockGetAll.mockResolvedValue([
                baseJob({ id: 'no-sched', userId: 'u1', name: 'A', schedule: null }),
                baseJob({
                    id: 'expired',
                    userId: 'u1',
                    name: 'B',
                    schedule: {
                        type: 'daily',
                        startDate: '2026-01-01T08:00:00.000Z',
                        endDate: '2026-06-01T12:00:00.000Z',
                    },
                }),
                baseJob({
                    id: 'future',
                    userId: 'u2',
                    name: 'C',
                    schedule: {
                        type: 'monthly',
                        startDate: futureStart,
                        endDate: null,
                    },
                }),
                baseJob({
                    id: 'once-past',
                    userId: 'u3',
                    name: 'D',
                    schedule: {
                        type: 'once',
                        startDate: '2026-01-01T08:00:00.000Z',
                        endDate: null,
                    },
                }),
                baseJob({
                    id: 'rec-past',
                    userId: 'u4',
                    name: 'E',
                    schedule: {
                        type: 'weekly',
                        startDate: '2026-06-01T08:00:00.000Z',
                        endDate: null,
                    },
                }),
            ]);

            await initializeDatabase();

            expect(mockSchedule).toHaveBeenCalledTimes(2);
            expect(mockSchedule).toHaveBeenCalledWith(
                expect.objectContaining({ jobId: 'future', type: 'monthly', startDate: futureStart })
            );
            expect(mockSchedule).toHaveBeenCalledWith(
                expect.objectContaining({ jobId: 'rec-past', type: 'weekly', startDate: nextRun.toISOString() })
            );

            expect(mockRegister).toHaveBeenCalledTimes(2);
        });
    });
});
