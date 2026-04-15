import { useEffect, useState } from 'react';

import JobCard from './jobCard/JobCard';
import JobDetailSheet from './jobDetailSheet/JobDetailSheet';
import JobFormSheet from './jobSheet/JobSheet';
import Button from '@/components/ui-app/button/Button';
import ConfirmationDialog from '@/components/ui-app/confirmationDialog/ConfirmationDialog';
import Heading from '@/components/ui-app/heading/Heading';

import mappers from './mappers';

import type { JobsState } from './Jobs.types';
import type { CreateJobInput, Job, JobFinishedEvent, JobTargetFinishedEvent, UpdateJobInput } from '@/_types/_gen';
import type { StreamSubscription } from '@/api/service/client/types';

import api from '@/api';

const Jobs = () => {
    // State
    const [state, setState] = useState<JobsState>({
        detailSheet: {
            isOpen: false,
            job: null,
        },
        confirmationDialog: {
            isOpen: false,
            jobId: null,
        },
        formSheet: {
            isOpen: false,
            job: null,
        },
        jobs: [],
        isLoading: false,
    });

    /**
     * Toggles the confirmation dialog.
     */
    const toggleConfirmationDialog = (jobId: string | null = null) => {
        setState(prev => ({
            ...prev,
            confirmationDialog: { isOpen: !prev.confirmationDialog.isOpen, jobId },
        }));
    };

    /**
     * Toggles the job detail sheet.
     */
    const toggleJobDetailSheet = (job: Job | null = null) => {
        setState(prev => ({ ...prev, detailSheet: { isOpen: !prev.detailSheet.isOpen, job } }));
    };

    /**
     * Toggles the form sheet.
     */
    const toggleJobFormSheet = (job: Job | null = null) => {
        setState(prev => ({ ...prev, formSheet: { isOpen: !prev.formSheet.isOpen, job } }));
    };

    /**
     * Updates the jobs list in state with the running jobs.
     */
    const onRunningJobsEvent = (runningJobs: string[]) => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.map(job => ({ ...job, isRunning: runningJobs.includes(job.id) })),
        }));
    };

    /**
     * Handles the `job-finished` stream event: marks the job idle and records when the run ended.
     *
     * The server emits one `executionId` per run (the same id as on `job-target-finished`). Live state
     * may already hold a matching `Execution` built from those events; this sets `schedule.finishedAt`
     * to the server timestamp so the UI matches persisted data without refetching.
     *
     * @param event - Payload from the stream: `jobId`, `executionId`, and `finishedAt` (ISO datetime).
     */
    const onJobFinishedEvent = (event: JobFinishedEvent) => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.map(job => {
                // Only the job that finished is updated; keep referential equality for the rest.
                if (job.id !== event.jobId) {
                    return job;
                }

                const { executions } = job;

                // No in-memory executions (e.g. missed target events): still clear running state.
                if (!executions?.length) {
                    return { ...job, isRunning: false };
                }

                // Align with the run the server reports; if we never merged that run, only clear running.
                const execIdx = executions.findIndex(e => e.executionId === event.executionId);
                if (execIdx === -1) {
                    return { ...job, isRunning: false };
                }

                // Immutable update: new executions array and new schedule object on the matched execution.
                const nextExecutions = [...executions];
                const prevExec = nextExecutions[execIdx];
                nextExecutions[execIdx] = {
                    ...prevExec,
                    schedule: { ...prevExec.schedule, finishedAt: event.finishedAt },
                };

                return { ...job, isRunning: false, executions: nextExecutions };
            }),
        }));
    };

    /**
     * Updates the jobs list in state with the finished target.
     */
    const onTargetFinishedEvent = (event: JobTargetFinishedEvent) => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.map(job =>
                job.id === event.jobId ? { ...job, executions: mappers.mapToExecutions(job.executions, event) } : job
            ),
        }));
    };

    /**
     * Deletes the selected job, removes it from state, and closes the confirmation dialog.
     */
    const deleteJob = async () => {
        try {
            const { jobId } = state.confirmationDialog;

            if (!jobId) {
                return;
            }

            await api.service.resources.jobs.deleteById(jobId);

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.filter(job => job.id !== jobId),
                confirmationDialog: { isOpen: false, jobId: null },
            }));
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Updates the selected job in state with the new data, replaces the old job with
     * the new one in the jobs list, and closes the form sheet.
     */
    const onUpdateJob = async (payload: UpdateJobInput) => {
        try {
            const { job } = state.formSheet;

            if (!job) return;

            const response = await api.service.resources.jobs.update(job.id, payload);

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(jobItem => (jobItem.id === response.data.id ? response.data : jobItem)),
                formSheet: { isOpen: false, job: null },
            }));
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Creates a new job from the form payload, adds the new job to
     * the jobs list in state, and closes the form sheet.
     */
    const onCreateJob = async (payload: CreateJobInput) => {
        try {
            const response = await api.service.resources.jobs.create(payload);

            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, response.data],
                formSheet: { isOpen: false, job: null },
            }));
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Fetches all jobs on mount, opens an SSE stream, and cleans up on unmount.
     */
    useEffect(() => {
        let subscription: StreamSubscription | null = null;

        const fetchAllJobs = async () => {
            try {
                const response = await api.service.resources.jobs.getAll();

                setState(prevState => ({
                    ...prevState,
                    jobs: response.data,
                    isLoading: false,
                }));

                subscription = api.service.resources.jobs.streamAll({
                    on: {
                        'running-jobs': ({ runningJobs }) => onRunningJobsEvent(runningJobs),
                        'job-finished': jobFinishedEvent => onJobFinishedEvent(jobFinishedEvent),
                        'job-target-finished': jobTargetFinishedEvent => onTargetFinishedEvent(jobTargetFinishedEvent),
                    },
                    // TODO: Handle stream errors
                    onError: err => console.error('Stream error:', err),
                });
            } catch (error) {
                console.log(error);
            }
        };

        fetchAllJobs();

        return () => {
            subscription?.close();
        };
    }, []);

    return (
        <section>
            <section className="flex items-center justify-between mb-4">
                <Heading size="l" level={2}>
                    Jobs
                </Heading>

                <Button label="Create job" onClick={() => toggleJobFormSheet()} />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.jobs.map(job => (
                    <JobCard
                        key={job.id}
                        job={job}
                        onOpen={() => toggleJobDetailSheet(job)}
                        onEdit={() => toggleJobFormSheet(job)}
                        onDelete={toggleConfirmationDialog}
                    />
                ))}
            </section>

            <JobDetailSheet
                isOpen={state.detailSheet.isOpen}
                onOpenChange={() => toggleJobDetailSheet()}
                job={state.detailSheet.job}
            />

            <JobFormSheet
                isOpen={state.formSheet.isOpen}
                onOpenChange={() => toggleJobFormSheet()}
                job={state.formSheet.job}
                onCreateJob={onCreateJob}
                onUpdateJob={onUpdateJob}
            />

            <ConfirmationDialog
                open={state.confirmationDialog.isOpen}
                onOpenChange={() => toggleConfirmationDialog()}
                title="Delete job"
                description="Please confirm that you want to delete the job."
                onConfirm={deleteJob}
                confirmLabel="Delete"
                confirmVariant="destructive"
            />
        </section>
    );
};

export default Jobs;
