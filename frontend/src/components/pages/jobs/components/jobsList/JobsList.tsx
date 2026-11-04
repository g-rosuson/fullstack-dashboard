import { MouseEvent, useState } from 'react';
import { PlusIcon } from 'lucide-react';

import JobCard from './components/jobCard/JobCard';
import JobDetailSheet from './components/jobDetailSheet/JobDetailSheet';
import Button from '@/components/blocks/button/Button';
import ConfirmationDialog from '@/components/blocks/confirmationDialog/ConfirmationDialog';
import Grid from '@/components/blocks/grid/Grid';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import mappers from '@/components/pages/jobs/components/jobsList/mappers';

import type { JobsListProps } from './JobsList.types';
import type { ConfirmableAction, JobStatus, PendingConfirmation, Schedule } from './types';

import jobListConstants from './constants';
import { Job, JobScheduleStatus, JobScheduleType, ScheduledJobEvent } from '@/_types/_gen';
import api from '@/api';
import jobConstants from '@/components/pages/jobs/constants';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';
import constants from '@/shared/constants';

interface State {
    jobIdToDisplay: string;
    confirmation: PendingConfirmation | null;
    isSubmitting: boolean;
}

const JobsList = ({
    jobs,
    jobIdToRunningJob,
    jobIdToScheduledJob,
    isStreamHydrated,
    onEditJob,
    onJobDeleted,
}: JobsListProps) => {
    const [state, setState] = useState<State>({
        jobIdToDisplay: '',
        confirmation: null,
        isSubmitting: false,
    });

    const { jobIdToDisplay, confirmation, isSubmitting } = state;

    /**
     * Toggles the job detail sheet.
     */
    const onOpenJob = (jobId?: string) => {
        setState(prev => ({ ...prev, jobIdToDisplay: jobId || '' }));
    };

    /**
     * Opens the confirmation dialog for a confirmable action.
     */
    const onRequestConfirm = (action: ConfirmableAction, jobId: string) => {
        setState(prev => ({ ...prev, confirmation: { action, jobId } }));
    };

    /**
     * Closes the confirmation dialog.
     */
    const onClearConfirmation = () => {
        setState(prev => ({ ...prev, confirmation: null }));
    };

    /**
     * Handles the confirmation action from a button click (stops propagation).
     */
    const onConfirmRequest = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        return (action: ConfirmableAction, jobId: string) => onRequestConfirm(action, jobId);
    };

    /**
     * Deletes the selected job and notifies the parent to remove it from state.
     */
    const onDeleteJob = async (jobId: string) => {
        const jobName = jobs.find(job => job.id === jobId)?.name || jobConstants.label.toast.fallback;

        try {
            const response = await api.service.resources.jobs.deleteById(jobId);

            if (jobIdToDisplay === jobId) {
                setState(prev => ({ ...prev, jobIdToDisplay: '' }));
            }

            toast.add({
                type: toastConstants.type.success,
                title: jobName,
                description: jobConstants.label.toast.deleted,
            });
            onJobDeleted(response.data.id);
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: jobConstants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : jobConstants.label.toast.mutationFailed,
            });
        }
    };

    /**
     * Stops a running job.
     */
    const onStopJob = async (jobId: string) => {
        const jobName = jobs.find(job => job.id === jobId)?.name || jobConstants.label.toast.fallback;

        try {
            await api.service.resources.jobs.stop(jobId);
            toast.add({
                type: toastConstants.type.success,
                title: jobName,
                description: jobConstants.label.toast.stop,
            });
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: jobConstants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : jobConstants.label.toast.mutationFailed,
            });
        }
    };

    /**
     * Starts an on-demand run of a job.
     */
    const onRunJob = async (jobId: string) => {
        const jobName = jobs.find(job => job.id === jobId)?.name || jobConstants.label.toast.fallback;

        try {
            await api.service.resources.jobs.run(jobId);
            toast.add({
                type: toastConstants.type.success,
                title: jobName,
                description: jobConstants.label.toast.run,
            });
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: jobConstants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : jobConstants.label.toast.mutationFailed,
            });
        }
    };

    /**
     * Changes the schedule status of a job.
     */
    const onChangeScheduleStatus = async (jobId: string, status: JobScheduleStatus) => {
        const jobName = jobs.find(job => job.id === jobId)?.name || jobConstants.label.toast.fallback;
        const description =
            status === JobScheduleStatus.stopped ? jobConstants.label.toast.pause : jobConstants.label.toast.activate;

        try {
            await api.service.resources.jobs.changeScheduleStatus(jobId, { status });
            toast.add({
                type: toastConstants.type.success,
                title: jobName,
                description,
            });
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: jobConstants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : jobConstants.label.toast.mutationFailed,
            });
        }
    };

    /**
     * Retries attaching the job schedule to the runtime.
     */
    const onRetrySchedule = async (jobId: string) => {
        const jobName = jobs.find(job => job.id === jobId)?.name || jobConstants.label.toast.fallback;

        try {
            await api.service.resources.jobs.retrySchedule(jobId);
            toast.add({
                type: toastConstants.type.success,
                title: jobName,
                description: jobConstants.label.toast.retry,
            });
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: jobConstants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : jobConstants.label.toast.mutationFailed,
            });
        }
    };

    /**
     * Runs the pending confirmation action, then clears the confirmation intent.
     */
    const onConfirmPendingAction = async () => {
        const pending = confirmation;

        if (!pending) return;

        setState(prev => ({ ...prev, isSubmitting: true }));

        switch (pending.action) {
            case jobListConstants.key.action.crud.delete:
                await onDeleteJob(pending.jobId);
                break;
            case jobListConstants.key.action.execution.stop:
                await onStopJob(pending.jobId);
                break;
            case jobListConstants.key.action.schedule.pause:
                await onChangeScheduleStatus(pending.jobId, JobScheduleStatus.stopped);
                break;
            case jobListConstants.key.action.schedule.activate:
                await onChangeScheduleStatus(pending.jobId, JobScheduleStatus.idle);
                break;
            case jobListConstants.key.action.schedule.retry:
                await onRetrySchedule(pending.jobId);
                break;
            case jobListConstants.key.action.execution.run:
                await onRunJob(pending.jobId);
                break;
        }

        setState(prev => ({ ...prev, confirmation: null, isSubmitting: false }));
    };

    /**
     * Maps a job to a schedule
     * @param job - The job to map the schedule for
     * @param streamSchedule - The stream schedule to map the schedule for
     * @returns The mapped schedule
     */
    const getSchedule = (job: Job, streamSchedule: ScheduledJobEvent) => {
        return mappers.mapToSchedule({ job, streamSchedule });
    };

    /**
     * Maps a job to a job status
     * @param job - The job to map the job status for
     * @param streamSchedule - The stream schedule to map the job status for
     * @param isRunning - Whether the job is running
     * @returns The mapped job status
     */
    const getJobStatus = (job: Job, streamSchedule: ScheduledJobEvent, isRunning: boolean) => {
        return mappers.mapToStatus({
            persistedSchedule: job.schedule,
            streamSchedule,
            isRunning,
        });
    };

    /**
     * Maps a job to dropdown items for the job card and the job detail sheet
     * @param job - The job to map the dropdown items for
     * @returns The dropdown items for the job
     */
    const mapToMenuItems = (job: Job) => {
        return [
            {
                label: jobListConstants.label.action.crud.open,
                onClick: () => onOpenJob(job.id),
            },
            {
                label: jobListConstants.label.action.crud.edit,
                onClick: () => onEditJob(job.id),
            },
            {
                label: jobListConstants.label.action.crud.delete,
                variant: 'destructive' as const,
                onClick: () => onRequestConfirm(jobListConstants.key.action.crud.delete, job.id),
            },
        ];
    };

    // Determine job details for display sheet
    const sheetJob = jobs.find(job => job.id === jobIdToDisplay);
    const sheetJobName = sheetJob?.name || '';
    let sheetSchedule: Schedule | undefined;
    let sheetJobStatus: JobStatus | undefined;

    if (sheetJob) {
        const streamSchedule = jobIdToScheduledJob[jobIdToDisplay];
        const isRunning = !!jobIdToRunningJob[jobIdToDisplay];

        sheetSchedule = getSchedule(sheetJob, streamSchedule);
        sheetJobStatus = getJobStatus(sheetJob, streamSchedule, isRunning);
    }

    // Determine the pending confirmation details and the confirmation confirm button label
    const pendingConfirmationDetails = confirmation ? jobListConstants.label.confirmation[confirmation.action] : null;
    const confirmationConfirmButtonLabel = {
        ...jobListConstants.label.action.execution,
        ...jobListConstants.label.action.schedule,
        delete: constants.ui.button.label.delete,
    } as const satisfies Record<ConfirmableAction, string>;

    return (
        <>
            <Grid minItemWidth={jobListConstants.layout.minItemWidth} gap={jobListConstants.layout.gap}>
                {jobs.map(job => {
                    const isRunning = !!jobIdToRunningJob[job.id];
                    const status = getJobStatus(job, jobIdToScheduledJob[job.id], isRunning);
                    const schedule = getSchedule(job, jobIdToScheduledJob[job.id]);

                    // Do not wait for "once" type schedules, because they are not
                    // recurring and therefore not kept in memory by the scheduler API
                    const hasScheduleToLoad = !!job.schedule && job.schedule.type !== JobScheduleType.once;

                    // Show skeleton when:
                    // Job has a schedule and it's not a once schedule and schedule stream has not been hydrated yet
                    const showSkeleton = hasScheduleToLoad && !isStreamHydrated;

                    return (
                        <JobCard
                            key={job.id}
                            jobId={job.id}
                            jobName={job.name}
                            schedule={schedule}
                            status={status}
                            showSkeleton={showSkeleton}
                            menuItems={mapToMenuItems(job)}
                            isSubmitting={isSubmitting}
                            onRequestConfirm={event => onConfirmRequest(event)(mappers.mapToActionType(status), job.id)}
                            onOpen={() => onOpenJob(job.id)}
                        />
                    );
                })}
            </Grid>

            <div className="fixed bottom-md right-md">
                <Button icon={<PlusIcon />} size="lg" ariaLabel="Create job" onClick={() => onEditJob()} />
            </div>

            <JobDetailSheet
                jobName={sheetJobName}
                executions={sheetJob?.executions || []}
                schedule={sheetSchedule}
                status={sheetJobStatus}
                menuItems={sheetJob ? mapToMenuItems(sheetJob) : []}
                isSubmitting={isSubmitting}
                isOpen={!!jobIdToDisplay}
                onOpenChange={() => onOpenJob()}
                onRequestConfirm={event => {
                    if (sheetJobStatus && sheetJob) {
                        onConfirmRequest(event)(mappers.mapToActionType(sheetJobStatus), sheetJob.id);
                    }
                }}
            />

            <ConfirmationDialog
                open={!!confirmation}
                onOpenChange={onClearConfirmation}
                title={pendingConfirmationDetails?.title ?? ''}
                description={pendingConfirmationDetails?.description}
                confirmLabel={confirmation ? confirmationConfirmButtonLabel[confirmation.action] : undefined}
                confirmVariant={pendingConfirmationDetails?.variant}
                onConfirm={onConfirmPendingAction}
            />
        </>
    );
};

export default JobsList;
