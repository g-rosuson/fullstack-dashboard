import mappers from './index';
import {
    type EmailTool,
    EmailToolTypeProperty,
    type ExecutionEmailToolTarget,
    type ExecutionEmailToolTargetResult,
    type ExecutionSchedule,
    ExecutionScheduleType,
    type ExecutionScraperToolTarget,
    type JobTargetFinishedEvent,
    JobTargetFinishedEventType,
    type ScraperTool,
    ScraperToolTypeProperty,
} from '@/_types/_gen';

/**
 * Builds a schedule with sensible defaults for mapper tests.
 */
const buildSchedule = (): ExecutionSchedule => ({
    delegatedAt: '2024-06-01T10:00:00.000Z',
    finishedAt: null,
    type: ExecutionScheduleType.once,
});

/**
 * Builds a scraper tool with sensible defaults for mapper tests.
 */
const buildScraperTool = (toolId: string): ScraperTool => ({
    type: ScraperToolTypeProperty.scraper,
    toolId,
    targets: [{ target: 'jobs-ch', targetId: 'api-placeholder' }],
});

/**
 * Builds a scraper execution target with sensible defaults for mapper tests.
 */
const buildScraperExecutionTarget = (targetId: string): ExecutionScraperToolTarget => ({
    target: 'jobs-ch',
    targetId,
    results: [{ error: null, result: null }],
});

/**
 * Builds an email tool with sensible defaults for mapper tests.
 */
const buildEmailTool = (toolId: string): EmailTool => ({
    type: EmailToolTypeProperty.email,
    toolId,
    subject: 'S',
    body: 'B',
    targets: [{ target: 'inbox', targetId: 'api-email-placeholder' }],
});

/**
 * Builds an email execution target with sensible defaults for mapper tests.
 */
const buildEmailExecutionTarget = (targetId: string): ExecutionEmailToolTarget => ({
    target: 'inbox',
    targetId,
    results: [
        {
            error: null,
            result: { body: 'x', email: 'y@z.com', subject: 'sub' },
        } satisfies ExecutionEmailToolTargetResult,
    ],
});

/**
 * Builds a job target finished event with sensible defaults for mapper tests.
 */
const buildJobTargetFinishedEvent = (
    overrides: Pick<JobTargetFinishedEvent, 'executionId' | 'tool' | 'target'> &
        Partial<Pick<JobTargetFinishedEvent, 'schedule' | 'jobId' | 'userId'>>
): JobTargetFinishedEvent => ({
    type: JobTargetFinishedEventType['job-target-finished'],
    jobId: 'job-1',
    userId: 'user-1',
    schedule: buildSchedule(),
    ...overrides,
});

describe('Jobs mappers: mapToExecutions', () => {
    it('creates one execution with schedule, one tool, and one target when executions is undefined', () => {
        const schedule = buildSchedule();
        const tool = buildScraperTool('tool-1');
        const target = buildScraperExecutionTarget('tgt-1');
        const event = buildJobTargetFinishedEvent({
            executionId: 'exec-1',
            schedule,
            tool,
            target,
        });

        expect(mappers.mapToExecutions(undefined, event)).toEqual([
            {
                executionId: 'exec-1',
                schedule,
                tools: [
                    {
                        ...tool,
                        targets: [target],
                    },
                ],
            },
        ]);
    });

    it('creates the same shape when executions is an empty array', () => {
        const schedule = buildSchedule();
        const tool = buildScraperTool('tool-1');
        const target = buildScraperExecutionTarget('tgt-1');
        const event = buildJobTargetFinishedEvent({
            executionId: 'exec-1',
            schedule,
            tool,
            target,
        });

        expect(mappers.mapToExecutions([], event)).toEqual(mappers.mapToExecutions(undefined, event));
    });

    it('appends a new execution when the event has a new executionId and leaves the prior run unchanged', () => {
        const toolA = buildScraperTool('t-a');
        const targetA = buildScraperExecutionTarget('ta-1');
        const eventA = buildJobTargetFinishedEvent({
            executionId: 'exec-a',
            tool: toolA,
            target: targetA,
        });

        const afterFirst = mappers.mapToExecutions(undefined, eventA);
        expect(afterFirst).toHaveLength(1);

        const toolB = buildScraperTool('t-b');
        const targetB = buildScraperExecutionTarget('tb-1');
        const eventB = buildJobTargetFinishedEvent({
            executionId: 'exec-b',
            tool: toolB,
            target: targetB,
        });

        const afterSecond = mappers.mapToExecutions(afterFirst, eventB);

        expect(afterSecond).toHaveLength(2);
        expect(afterSecond[0]).toEqual(afterFirst[0]);
        expect(afterSecond[1]).toEqual({
            executionId: 'exec-b',
            schedule: eventB.schedule,
            tools: [{ ...toolB, targets: [targetB] }],
        });
    });

    it('appends a second target to the same tool when executionId and toolId match', () => {
        const tool = buildScraperTool('same-tool');
        const target1 = buildScraperExecutionTarget('row-1');
        const target2 = buildScraperExecutionTarget('row-2');

        const event1 = buildJobTargetFinishedEvent({
            executionId: 'exec-merge',
            tool,
            target: target1,
        });
        const afterFirst = mappers.mapToExecutions(undefined, event1);

        const event2 = buildJobTargetFinishedEvent({
            executionId: 'exec-merge',
            tool,
            target: target2,
        });
        const afterSecond = mappers.mapToExecutions(afterFirst, event2);

        expect(afterSecond).toHaveLength(1);
        expect(afterSecond[0].tools).toHaveLength(1);
        expect(afterSecond[0].tools[0].targets).toEqual([target1, target2]);
    });

    it('adds a second tool when executionId matches but toolId is new', () => {
        const tool1 = buildScraperTool('tool-first');
        const tool2 = buildScraperTool('tool-second');
        const target1 = buildScraperExecutionTarget('u1');
        const target2 = buildScraperExecutionTarget('u2');

        const afterFirst = mappers.mapToExecutions(
            undefined,
            buildJobTargetFinishedEvent({
                executionId: 'exec-multi-tool',
                tool: tool1,
                target: target1,
            })
        );

        const afterSecond = mappers.mapToExecutions(
            afterFirst,
            buildJobTargetFinishedEvent({
                executionId: 'exec-multi-tool',
                tool: tool2,
                target: target2,
            })
        );

        expect(afterSecond[0].tools).toHaveLength(2);
        expect(afterSecond[0].tools[0]).toEqual({ ...tool1, targets: [target1] });
        expect(afterSecond[0].tools[1]).toEqual({ ...tool2, targets: [target2] });
    });

    it('updates only the matching execution in a three-run list and leaves the other runs unchanged', () => {
        const tool = buildScraperTool('t-mid');
        const tA = buildScraperExecutionTarget('a1');
        const tB1 = buildScraperExecutionTarget('b1');
        const tB2 = buildScraperExecutionTarget('b2');
        const tC = buildScraperExecutionTarget('c1');

        let list = mappers.mapToExecutions(
            undefined,
            buildJobTargetFinishedEvent({ executionId: 'ex-a', tool, target: tA })
        );
        list = mappers.mapToExecutions(list, buildJobTargetFinishedEvent({ executionId: 'ex-b', tool, target: tB1 }));
        list = mappers.mapToExecutions(list, buildJobTargetFinishedEvent({ executionId: 'ex-c', tool, target: tC }));

        const merged = mappers.mapToExecutions(
            list,
            buildJobTargetFinishedEvent({ executionId: 'ex-b', tool, target: tB2 })
        );

        expect(merged).toHaveLength(3);
        expect(merged[1].executionId).toBe('ex-b');
        expect(merged[1].tools[0].targets).toEqual([tB1, tB2]);
        expect(merged[0]).toEqual(list[0]);
        expect(merged[2]).toEqual(list[2]);
    });

    it('merges an email tool and execution email target the same way as a scraper', () => {
        const tool = buildEmailTool('email-tool-1');
        const target = buildEmailExecutionTarget('em-1');
        const event = buildJobTargetFinishedEvent({
            executionId: 'exec-email',
            tool,
            target,
        });

        expect(mappers.mapToExecutions(undefined, event)).toEqual([
            {
                executionId: 'exec-email',
                schedule: event.schedule,
                tools: [{ ...tool, targets: [target] }],
            },
        ]);
    });
});
