import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, type Mock } from 'vitest';

import type { JobsListProps } from './JobsList.types';

import JobsList from './JobsList';
import { ExecutionScheduleType } from '@/_types/_gen';
import api from '@/api';
import jobConstants from '@/components/pages/jobs/constants';
import {
    buildJob,
    buildStreamSchedule,
    futureIso,
    JobScheduleStatus,
    JobScheduleType,
    pastIso,
} from '@/components/pages/jobs/jobs.test.fixtures';
import { CustomError } from '@/services/error';
import utils from '@/utils';

const mockToastAdd = vi.hoisted(() => vi.fn());

vi.mock('@/api', () => ({
    default: {
        service: {
            resources: {
                jobs: {
                    deleteById: vi.fn(),
                    stop: vi.fn(),
                    run: vi.fn(),
                    changeScheduleStatus: vi.fn(),
                    retrySchedule: vi.fn(),
                },
            },
        },
    },
}));

vi.mock('@/components/blocks/toast/Toast', async importOriginal => {
    const actual = await importOriginal<typeof import('@/components/blocks/toast/Toast')>();

    return {
        ...actual,
        toast: {
            add: mockToastAdd,
            close: actual.toast.close,
            update: actual.toast.update,
            promise: actual.toast.promise,
        },
    };
});

vi.mock('@/services/logging', () => ({
    default: {
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

/**
 * Renders JobsList with one job and overlay defaults.
 */
const renderList = (props: Partial<JobsListProps> = {}) => {
    const jobs = props.jobs ?? [buildJob()];

    return render(
        <JobsList
            jobs={jobs}
            jobIdToRunningJob={props.jobIdToRunningJob ?? {}}
            jobIdToScheduledJob={props.jobIdToScheduledJob ?? {}}
            isStreamHydrated={props.isStreamHydrated ?? true}
            onEditJob={props.onEditJob ?? vi.fn()}
            onJobDeleted={props.onJobDeleted ?? vi.fn()}
        />
    );
};

/**
 * Confirms the pending action in the confirmation dialog.
 */
const confirmAction = async (confirmLabel: string) => {
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
};

describe('JobsList: entry presentation', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-JOBS-ENT-001] running entry shows Running and Stop', () => {
        renderList({
            jobIdToRunningJob: { 'job-1': { jobId: 'job-1', emittedEvents: [] } },
        });

        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-002] no schedule shows Inactive, Run, and last-run from executions', () => {
        const delegatedAt = '2024-06-01T10:00:00.000Z';
        renderList({
            jobs: [
                buildJob({
                    executions: [
                        {
                            executionId: 'exec-1',
                            schedule: {
                                delegatedAt,
                                finishedAt: null,
                                cancelledAt: null,
                                type: ExecutionScheduleType.once,
                            },
                            tools: [],
                        },
                    ],
                }),
            ],
        });

        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
        expect(screen.getAllByText(utils.time.formatDate(delegatedAt) as string).length).toBeGreaterThan(0);
    });

    it('[CLIENT-JOBS-ENT-003] once active before start shows Active, Pause, and next-run', () => {
        const startDate = futureIso();
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.once,
                        startDate,
                        endDate: null,
                        status: JobScheduleStatus.idle,
                    },
                }),
            ],
        });

        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
        expect(screen.getAllByText(utils.time.formatDate(startDate) as string).length).toBeGreaterThan(0);
    });

    it('[CLIENT-JOBS-ENT-004] once stopped before start shows Paused and Activate', () => {
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.once,
                        startDate: futureIso(),
                        endDate: null,
                        status: JobScheduleStatus.stopped,
                    },
                }),
            ],
        });

        expect(screen.getByText('Paused')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-005] once after start shows Inactive and Run', () => {
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.once,
                        startDate: pastIso(),
                        endDate: null,
                        status: JobScheduleStatus.idle,
                    },
                }),
            ],
        });

        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-006] recurring active attached shows Active, Pause, and stream next-run', () => {
        const nextRun = futureIso();
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.daily,
                        startDate: pastIso(),
                        endDate: null,
                        status: JobScheduleStatus.idle,
                    },
                }),
            ],
            jobIdToScheduledJob: {
                'job-1': buildStreamSchedule({ status: JobScheduleStatus.idle, nextRun }),
            },
        });

        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
        expect(screen.getByText(utils.time.formatDate(nextRun) as string)).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-007] recurring stopped attached shows Paused and Activate', () => {
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.daily,
                        startDate: pastIso(),
                        endDate: null,
                        status: JobScheduleStatus.stopped,
                    },
                }),
            ],
            jobIdToScheduledJob: {
                'job-1': buildStreamSchedule({ status: JobScheduleStatus.stopped }),
            },
        });

        expect(screen.getByText('Paused')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-008] recurring missing stream shows Missing and Reschedule', () => {
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.daily,
                        startDate: pastIso(),
                        endDate: null,
                        status: JobScheduleStatus.idle,
                    },
                }),
            ],
            jobIdToScheduledJob: {},
            isStreamHydrated: true,
        });

        expect(screen.getByText('Missing')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-ENT-009] recurring past end shows Inactive and Run', () => {
        renderList({
            jobs: [
                buildJob({
                    schedule: {
                        type: JobScheduleType.daily,
                        startDate: pastIso(),
                        endDate: pastIso(),
                        status: JobScheduleStatus.idle,
                    },
                }),
            ],
            jobIdToScheduledJob: {
                'job-1': buildStreamSchedule(),
            },
        });

        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    });
});

describe('JobsList: detail open and close', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-JOBS-GET-001] opens detail from the list entry with name and executions', async () => {
        renderList();

        await userEvent.click(screen.getByRole('heading', { name: 'Alpha', level: 2 }));

        const detail = await screen.findByRole('dialog', { name: 'Alpha' });
        expect(within(detail).getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
        expect(within(detail).getByRole('heading', { name: 'Executions' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-GET-002] opens the same detail from the entry menu', async () => {
        renderList();

        await userEvent.click(screen.getByRole('button', { name: 'Dropdown menu trigger' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Open' }));

        const detail = await screen.findByRole('dialog', { name: 'Alpha' });
        expect(within(detail).getByRole('heading', { name: 'Executions' })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-GET-003] closes detail and keeps the list entry', async () => {
        renderList();

        await userEvent.click(screen.getByRole('heading', { name: 'Alpha', level: 2 }));
        const detail = await screen.findByRole('dialog', { name: 'Alpha' });
        await userEvent.click(within(detail).getByRole('button', { name: 'Close' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: 'Alpha' })).not.toBeInTheDocument();
        });
        expect(screen.getByRole('heading', { name: 'Alpha', level: 2 })).toBeInTheDocument();
    });
});

describe('JobsList: mutation toasts', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-JOBS-NTF-001] shows a success toast after delete', async () => {
        const onJobDeleted = vi.fn();
        (api.service.resources.jobs.deleteById as Mock).mockResolvedValue({ data: { id: 'job-1' } });
        renderList({ onJobDeleted });

        await userEvent.click(screen.getByRole('button', { name: 'Dropdown menu trigger' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await confirmAction('Delete');

        await waitFor(() => {
            expect(mockToastAdd).toHaveBeenCalledWith({
                type: 'success',
                title: 'Alpha',
                description: jobConstants.label.toast.deleted,
            });
        });
        expect(onJobDeleted).toHaveBeenCalledWith('job-1');
    });

    it('[CLIENT-JOBS-NTF-002] shows an error toast when delete is rejected', async () => {
        (api.service.resources.jobs.deleteById as Mock).mockRejectedValue(
            new CustomError('Cannot delete a job while it is running')
        );
        renderList({
            jobIdToRunningJob: { 'job-1': { jobId: 'job-1', emittedEvents: [] } },
        });

        await userEvent.click(screen.getByRole('button', { name: 'Dropdown menu trigger' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
        await confirmAction('Delete');

        await waitFor(() => {
            expect(mockToastAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    description: 'Cannot delete a job while it is running',
                })
            );
        });
        expect(screen.getByRole('heading', { name: 'Alpha', level: 2 })).toBeInTheDocument();
    });

    it('[CLIENT-JOBS-NTF-001] shows a success toast after run', async () => {
        (api.service.resources.jobs.run as Mock).mockResolvedValue({ data: { jobId: 'job-1' } });
        renderList();

        await userEvent.click(screen.getByRole('button', { name: 'Run' }));
        await confirmAction('Run');

        await waitFor(() => {
            expect(mockToastAdd).toHaveBeenCalledWith({
                type: 'success',
                title: 'Alpha',
                description: jobConstants.label.toast.run,
            });
        });
    });
});
