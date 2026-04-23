import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach } from 'vitest';

import type { Execution, Job, JobSchedule } from '@/_types/_gen';

import JobCard from './JobCard';

/**
 * Mock the DropdownMenu to expose items as plain buttons, avoiding
 * Radix portal/pointer-event setup in unit tests.
 */
vi.mock('@/components/ui-app/dropdownMenu/DropdownMenu', () => ({
    default: ({ dropdownItems }: any) => (
        <div>
            {dropdownItems.map((item: any) => (
                <button key={item.label} onClick={item.onClick}>
                    {item.label}
                </button>
            ))}
        </div>
    ),
}));

/**
 * Mock the Spinner so presence can be asserted without CSS/animation setup.
 */
vi.mock('@/components/ui/spinner', () => ({
    Spinner: () => <span aria-label="spinner" />,
}));

/**
 * Builds a minimal Job fixture.
 * Overrides allow individual tests to focus only on the field under test.
 */
const buildJob = (overrides: Partial<Job> = {}): Job =>
    ({
        id: 'job-1',
        name: 'Alpha',
        schedule: null,
        tools: [],
        executions: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: null,
        userId: 'user-1',
        ...overrides,
    }) as Job;

/**
 * Builds a minimal scheduled Job fixture with sensible defaults.
 * The start date is in the past and end date defaults to null (open-ended).
 */
const buildScheduledJob = (scheduleOverrides: Partial<JobSchedule & object> = {}): Job =>
    buildJob({
        schedule: {
            type: 'recurring',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: null,
            lastRun: null,
            nextRun: null,
            ...scheduleOverrides,
        } as JobSchedule,
    });

/**
 * Builds an Execution fixture with the given delegatedAt timestamp.
 */
const buildExecution = (delegatedAt: string): Execution => ({
    executionId: `exec-${delegatedAt}`,
    schedule: {
        type: 'once',
        delegatedAt,
        finishedAt: null,
    },
    tools: [],
});

/**
 * Default callback spies shared across tests.
 */
const onOpen = vi.fn();
const onEdit = vi.fn();
const onDelete = vi.fn();

const renderComponent = (job: Job, isRunning = false) =>
    render(<JobCard job={job} isRunning={isRunning} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />);

describe('JobCard: job name', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('renders the job name', () => {
        renderComponent(buildJob({ name: 'My Job' }));
        expect(screen.getByText('My Job')).toBeInTheDocument();
    });
});

describe('JobCard: status badge', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('shows "Pending" badge for a scheduled job that is not yet running', () => {
        renderComponent(buildScheduledJob());
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows "Running" badge with a spinner when isRunning is true', () => {
        renderComponent(buildScheduledJob(), true);
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByLabelText('spinner')).toBeInTheDocument();
    });

    it('shows "Idle" badge for an un-scheduled job that is not running', () => {
        renderComponent(buildJob({ schedule: null }));
        expect(screen.getByText('Idle')).toBeInTheDocument();
    });

    it('shows "Idle" badge when the schedule end date is in the past and job is not running', () => {
        renderComponent(buildScheduledJob({ endDate: '2020-01-01T00:00:00.000Z' }));
        expect(screen.getByText('Idle')).toBeInTheDocument();
    });

    it('shows "Pending" for a scheduled job with a future end date that is not running', () => {
        renderComponent(buildScheduledJob({ endDate: '2099-01-01T00:00:00.000Z' }));
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.queryByText('Idle')).not.toBeInTheDocument();
    });

    it('shows "Running" badge even when the schedule end date is in the past', () => {
        renderComponent(buildScheduledJob({ endDate: '2020-01-01T00:00:00.000Z' }), true);
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.queryByText('Idle')).not.toBeInTheDocument();
    });
});

describe('JobCard: schedule type badge', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('shows the schedule type when a schedule is present', () => {
        renderComponent(buildScheduledJob());
        expect(screen.getByText('recurring')).toBeInTheDocument();
    });

    it('shows "Un-scheduled" when the job has no schedule', () => {
        renderComponent(buildJob({ schedule: null }));
        expect(screen.getByText('Un-scheduled')).toBeInTheDocument();
    });
});

describe('JobCard: date fields', () => {
    /**
     * Override toLocaleString to return the ISO string so date assertions
     * are deterministic across locales and environments.
     */
    beforeEach(() => {
        // eslint-disable-next-line no-unused-vars
        vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(function (this: Date) {
            return this.toISOString();
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('shows the formatted nextRun date when present', () => {
        renderComponent(buildScheduledJob({ nextRun: '2024-06-01T09:00:00.000Z' }));
        expect(screen.getByText('2024-06-01T09:00:00.000Z')).toBeInTheDocument();
    });

    it('shows "n/a" for nextRun when schedule.nextRun is null', () => {
        renderComponent(buildScheduledJob({ nextRun: null }));
        // "n/a" can appear for multiple fields; scope to the Next run section
        const nextRunSection = screen.getByText('Next run').parentElement!;
        expect(within(nextRunSection).getByText('n/a')).toBeInTheDocument();
    });

    it('shows the formatted lastRun date from schedule.lastRun when present', () => {
        renderComponent(buildScheduledJob({ lastRun: '2024-05-20T08:00:00.000Z' }));
        expect(screen.getByText('2024-05-20T08:00:00.000Z')).toBeInTheDocument();
    });

    it('falls back to the most recent execution delegatedAt when schedule.lastRun is null', () => {
        const job = buildJob({
            schedule: null,
            executions: [
                buildExecution('2024-03-01T10:00:00.000Z'),
                buildExecution('2024-05-01T10:00:00.000Z'), // most recent
                buildExecution('2024-01-01T10:00:00.000Z'),
            ],
        });

        renderComponent(job);
        expect(screen.getByText('2024-05-01T10:00:00.000Z')).toBeInTheDocument();
    });

    it('shows "n/a" for lastRun when both schedule.lastRun and executions are absent', () => {
        renderComponent(buildJob({ schedule: null, executions: [] }));
        const lastRunSection = screen.getByText('Last run').parentElement!;
        expect(within(lastRunSection).getByText('n/a')).toBeInTheDocument();
    });

    it('shows the formatted startDate when present', () => {
        renderComponent(buildScheduledJob({ startDate: '2024-01-15T06:00:00.000Z' }));
        expect(screen.getByText('2024-01-15T06:00:00.000Z')).toBeInTheDocument();
    });

    it('shows "n/a" for startDate when job has no schedule', () => {
        renderComponent(buildJob({ schedule: null }));
        const startSection = screen.getByText('Start').parentElement!;
        expect(within(startSection).getByText('n/a')).toBeInTheDocument();
    });

    it('shows the formatted endDate when present', () => {
        renderComponent(buildScheduledJob({ endDate: '2099-12-31T23:59:00.000Z' }));
        expect(screen.getByText('2099-12-31T23:59:00.000Z')).toBeInTheDocument();
    });

    it('shows "n/a" for endDate when schedule.endDate is null', () => {
        renderComponent(buildScheduledJob({ endDate: null }));
        const endSection = screen.getByText('End').parentElement!;
        expect(within(endSection).getByText('n/a')).toBeInTheDocument();
    });
});

describe('JobCard: user interactions', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('calls onOpen with the job when the card is clicked', async () => {
        const job = buildJob();
        renderComponent(job);
        // The card itself is the click target; use the job name as the accessible anchor
        await userEvent.click(screen.getByText('Alpha'));
        expect(onOpen).toHaveBeenCalledWith(job);
    });

    it('calls onEdit with the job when the Edit dropdown item is clicked', async () => {
        const job = buildJob();
        renderComponent(job);
        await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
        expect(onEdit).toHaveBeenCalledWith(job);
        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onOpen with the job when the Open dropdown item is clicked', async () => {
        const job = buildJob();
        renderComponent(job);
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        expect(onOpen).toHaveBeenCalledWith(job);
    });

    it('calls onDelete with job.id when the Delete dropdown item is clicked', async () => {
        const job = buildJob({ id: 'job-42' });
        renderComponent(job);
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onDelete).toHaveBeenCalledWith('job-42');
        expect(onDelete).toHaveBeenCalledTimes(1);
    });
});
