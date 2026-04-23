import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, Mock } from 'vitest';

import type { Job } from '@/_types/_gen';

import Jobs from './Jobs';
import api from '@/api';

/**
 *
 * Mock the API service.
 */
const streamAllMock = vi.hoisted(() => vi.fn());
const closeSubscriptionMock = vi.hoisted(() => vi.fn());
vi.mock('@/api', () => ({
    default: {
        service: {
            resources: {
                jobs: {
                    getAll: vi.fn(),
                    streamAll: streamAllMock,
                    create: vi.fn(),
                    update: vi.fn(),
                    deleteById: vi.fn(),
                },
            },
        },
    },
}));

/**
 * Mock the JobCard component.
 */
vi.mock('./components/jobCard/JobCard', () => ({
    default: ({ job, isRunning, onEdit, onOpen, onDelete }: any) => (
        <article aria-label={`Job card ${job.name}`}>
            {job.name}
            <p>Status: {isRunning ? 'Running' : 'Idle'}</p>
            <p>Last run: {job.schedule?.lastRun ?? 'none'}</p>
            <p>Next run: {job.schedule?.nextRun ?? 'none'}</p>
            <p>Finished at: {job.executions?.[0]?.schedule?.finishedAt ?? 'none'}</p>
            <p>Execution count: {job.executions?.length ?? 0}</p>
            <button onClick={() => onEdit(job)}>Edit {job.name}</button>
            <button onClick={() => onOpen(job)}>Open {job.name}</button>
            <button onClick={() => onDelete(job.id)}>Delete {job.name}</button>
        </article>
    ),
}));

/**
 * Mock the JobDetailSheet component.
 */
vi.mock('./components/jobDetailSheet/JobDetailSheet', () => ({ default: () => null }));

/**
 * Mock the ConfirmationDialog component.
 */
vi.mock('@/components/ui-app/confirmationDialog/ConfirmationDialog', () => ({
    default: ({ open, onConfirm }: any) =>
        open ? (
            <div role="dialog" aria-label="Confirm delete dialog">
                <button onClick={onConfirm}>Delete confirmation action</button>
            </div>
        ) : null,
}));
/**
 * Mock the JobFormSheet component.
 */
const mockCreatePayload = { name: 'Created from sheet', tools: [], schedule: null };
const mockUpdatePayload = { name: 'Updated from sheet', tools: [], schedule: null, runJob: false };
vi.mock('./components/jobSheet/JobSheet', () => ({
    default: ({ isOpen, onOpenChange, onCreateJob, onUpdateJob }: any) =>
        isOpen ? (
            <section aria-label="Job form sheet">
                <button onClick={() => onCreateJob(mockCreatePayload)}>Create job sheet action</button>
                <button onClick={() => onUpdateJob(mockUpdatePayload)}>Update job sheet action</button>
                <button onClick={onOpenChange}>Close form sheet</button>
            </section>
        ) : null,
}));

/**
 * Mock the Button component.
 */
vi.mock('@/components/ui-app/button/Button', () => ({
    default: ({ disabled, label, onClick }: any) => (
        <button disabled={disabled} onClick={onClick}>
            {label}
        </button>
    ),
}));

/**
 * Mock the Heading component.
 */
vi.mock('@/components/ui-app/heading/Heading', () => ({
    default: ({ children, level }: any) => {
        const Tag = `h${level ?? 2}` as keyof React.JSX.IntrinsicElements;
        return <Tag>{children}</Tag>;
    },
}));

/**
 * Mock the Spinner component.
 */
vi.mock('@/components/ui/spinner', () => ({
    Spinner: () => <div role="status">Loading...</div>,
}));

/**
 * Builds a minimal Job fixture for page-level tests.
 */
const buildJob = (overrides: Partial<Job> = {}): Job =>
    ({
        id: 'job-1',
        name: 'Alpha',
        schedule: null,
        tools: [],
        executions: [],
        ...overrides,
    }) as Job;

/**
 * Returns stream handlers passed by Jobs into streamAll.
 */
const getStreamHandlers = () => {
    const streamAllCall = (streamAllMock as Mock).mock.calls[0]?.[0];
    return streamAllCall?.on ?? {};
};

/**
 * Initial render tests.
 */
describe('Jobs page: initial render', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('renders the heading', () => {
        // Keep fetch pending so this test stays purely synchronous.
        (api.service.resources.jobs.getAll as Mock).mockReturnValue(new Promise(() => {}));
        render(<Jobs />);

        expect(screen.getByRole('heading', { level: 1, name: 'Jobs' })).toBeInTheDocument();
    });

    it('renders the create job button', () => {
        // Keep fetch pending so this test stays purely synchronous.
        (api.service.resources.jobs.getAll as Mock).mockReturnValue(new Promise(() => {}));
        render(<Jobs />);

        expect(screen.getByRole('button', { name: 'Create job' })).toBeInTheDocument();
    });

    it('shows loading state and disables UI elements when jobs are fetched', () => {
        // getAll never resolves so the component stays in loading state
        (api.service.resources.jobs.getAll as Mock).mockReturnValue(new Promise(() => {}));

        render(<Jobs />);

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create job' })).toBeDisabled();
    });

    it('hides loading state, shows cards and enables UI elements after jobs are fetched', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob(), buildJob({ id: 'job-2', name: 'Beta' })],
        });

        render(<Jobs />);

        // Loading state is visible immediately while the request is in-flight
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create job' })).toBeDisabled();

        // After the fetch resolves the spinner is gone and cards are shown
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Create job' })).toBeEnabled();
            expect(screen.getByRole('article', { name: 'Job card Alpha' })).toBeInTheDocument();
            expect(screen.getByRole('article', { name: 'Job card Beta' })).toBeInTheDocument();
        });
    });

    // TODO: Add placeholder test when we add a placeholder
    it('does not render cards and shows placeholder when no jobs exist', () => {
        // Keep fetch pending so the test does not race with async updates.
        (api.service.resources.jobs.getAll as Mock).mockReturnValue(new Promise(() => {}));
        render(<Jobs />);
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });
});

describe('Jobs page: sheet and dialog flows', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('opens and closes the create form sheet correctly', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [],
        });
        render(<Jobs />);
        expect(screen.getByRole('button', { name: 'Create job' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Create job' }));
        expect(screen.getByRole('region', { name: 'Job form sheet' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Close form sheet' }));
        expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();
    });

    it('opens and closes the edit form sheet correctly', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Edit Alpha' })).toBeInTheDocument();
            expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
        expect(screen.getByRole('region', { name: 'Job form sheet' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Close form sheet' }));
        expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();
    });
});

/**
 * Stream events tests.
 */
describe('Jobs page: job CRUD flows', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('creates a job from the create form sheet and shows the card in the list', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [],
        });
        render(<Jobs />);
        (api.service.resources.jobs.create as Mock).mockResolvedValue({
            data: buildJob({ id: 'job-2', name: 'Beta' }),
        });
        await userEvent.click(screen.getByRole('button', { name: 'Create job' }));
        await userEvent.click(screen.getByRole('button', { name: 'Create job sheet action' }));
        await waitFor(() => {
            expect(api.service.resources.jobs.create).toHaveBeenCalledWith(mockCreatePayload);
            expect(screen.getByRole('article', { name: 'Job card Beta' })).toBeInTheDocument();
            expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();
        });
    });

    it('updates a job from the update form sheet and shows the updated card in the list', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        (api.service.resources.jobs.update as Mock).mockResolvedValue({
            data: buildJob({ id: 'job-1', name: 'Alpha updated' }),
        });

        render(<Jobs />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Edit Alpha' })).toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }));
        await userEvent.click(screen.getByRole('button', { name: 'Update job sheet action' }));

        await waitFor(() => {
            expect(api.service.resources.jobs.update).toHaveBeenCalledWith('job-1', mockUpdatePayload);
            expect(screen.getByRole('article', { name: 'Job card Alpha updated' })).toBeInTheDocument();
            expect(screen.queryByRole('region', { name: 'Job form sheet' })).not.toBeInTheDocument();
        });
    });

    it('deletes a job from the delete form sheet and removes the card from the list', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        (api.service.resources.jobs.deleteById as Mock).mockResolvedValue({});
        render(<Jobs />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Delete Alpha' })).toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Delete confirmation action' })).toBeInTheDocument();
        });

        await userEvent.click(screen.getByRole('button', { name: 'Delete confirmation action' }));

        await waitFor(() => {
            expect(api.service.resources.jobs.deleteById).toHaveBeenCalledWith('job-1');
            expect(screen.queryByRole('article', { name: 'Job card Alpha' })).not.toBeInTheDocument();
            expect(screen.queryByRole('dialog', { name: 'Confirm delete dialog' })).not.toBeInTheDocument();
        });
    });
});

/**
 * Stream events tests.
 */
describe('Jobs page: stream events', () => {
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('connects to the stream on mount', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
        });
    });

    it('registers required stream handlers and an onError callback', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
        });

        const streamAllArgs = (streamAllMock as Mock).mock.calls[0]?.[0];
        expect(streamAllArgs).toMatchObject({
            on: {
                'running-jobs': expect.any(Function),
                'job-finished': expect.any(Function),
                'job-target-finished': expect.any(Function),
            },
            onError: expect.any(Function),
        });
    });

    it('consumes running-jobs fields and marks the matching job as running', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
            expect(screen.getByRole('article', { name: 'Job card Alpha' })).toBeInTheDocument();
        });

        await act(async () => {
            getStreamHandlers()['running-jobs']({ runningJobs: ['job-1'] });
        });

        expect(screen.getByText('Status: Running')).toBeInTheDocument();
    });

    it('consumes job-finished fields and updates schedule plus finished timestamp', async () => {
        const jobWithExecution = buildJob({
            schedule: {
                type: 'once',
                startDate: '2024-01-01T00:00:00.000Z',
                endDate: null,
                lastRun: null,
                nextRun: null,
            },
            executions: [
                {
                    executionId: 'exec-1',
                    schedule: {
                        type: 'once',
                        delegatedAt: '2024-01-01T00:00:00.000Z',
                        finishedAt: null,
                    },
                    tools: [],
                },
            ],
        } as any);

        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [jobWithExecution],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            getStreamHandlers()['running-jobs']({ runningJobs: ['job-1'] });
        });
        expect(screen.getByText('Status: Running')).toBeInTheDocument();

        await act(async () => {
            getStreamHandlers()['job-finished']({
                jobId: 'job-1',
                executionId: 'exec-1',
                finishedAt: '2024-04-01T11:15:00.000Z',
                lastRun: '2024-04-01T11:10:00.000Z',
                nextRun: '2024-04-02T11:10:00.000Z',
            });
        });

        expect(screen.getByText('Status: Idle')).toBeInTheDocument();
        expect(screen.getByText('Last run: 2024-04-01T11:10:00.000Z')).toBeInTheDocument();
        expect(screen.getByText('Next run: 2024-04-02T11:10:00.000Z')).toBeInTheDocument();
        expect(screen.getByText('Finished at: 2024-04-01T11:15:00.000Z')).toBeInTheDocument();
    });

    it('consumes job-target-finished fields and updates execution data for the matching job', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
            expect(screen.getByText('Execution count: 0')).toBeInTheDocument();
        });

        await act(async () => {
            getStreamHandlers()['job-target-finished']({
                jobId: 'job-1',
                executionId: 'exec-1',
                schedule: {
                    type: 'once',
                    delegatedAt: '2024-04-01T11:00:00.000Z',
                    finishedAt: null,
                },
                tool: {
                    type: 'scraper',
                    toolId: 'tool-1',
                    targets: [{ target: 'jobs-ch', targetId: 'api-target-1' }],
                },
                target: {
                    target: 'jobs-ch',
                    targetId: 'target-1',
                    results: [{ error: null, result: null }],
                },
            });
        });

        expect(screen.getByText('Execution count: 1')).toBeInTheDocument();
    });

    it('ignores stream events for unknown job ids', async () => {
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [buildJob()],
        });
        render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
            expect(screen.getByText('Status: Idle')).toBeInTheDocument();
            expect(screen.getByText('Execution count: 0')).toBeInTheDocument();
        });

        await act(async () => {
            getStreamHandlers()['running-jobs']({ runningJobs: ['unknown-job-id'] });
            getStreamHandlers()['job-finished']({
                jobId: 'unknown-job-id',
                executionId: 'missing-exec',
                finishedAt: '2024-04-01T11:15:00.000Z',
                lastRun: '2024-04-01T11:10:00.000Z',
                nextRun: '2024-04-02T11:10:00.000Z',
            });
            getStreamHandlers()['job-target-finished']({
                jobId: 'unknown-job-id',
                executionId: 'missing-exec',
                schedule: { type: 'once', delegatedAt: '2024-04-01T11:00:00.000Z', finishedAt: null },
                tool: { type: 'scraper', toolId: 'tool-1', targets: [] },
                target: { target: 'jobs-ch', targetId: 'missing-target', results: [] },
            });
        });

        expect(screen.getByText('Status: Idle')).toBeInTheDocument();
        expect(screen.getByText('Execution count: 0')).toBeInTheDocument();
    });

    it('closes the stream on unmount', async () => {
        streamAllMock.mockReturnValue({ close: closeSubscriptionMock });
        (api.service.resources.jobs.getAll as Mock).mockResolvedValue({
            data: [],
        });
        const { unmount } = render(<Jobs />);

        await waitFor(() => {
            expect(streamAllMock).toHaveBeenCalledTimes(1);
        });

        unmount();

        await waitFor(() => {
            expect(closeSubscriptionMock).toHaveBeenCalledTimes(1);
        });
    });
});
