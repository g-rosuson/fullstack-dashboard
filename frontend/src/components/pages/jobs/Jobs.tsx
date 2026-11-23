import { useCallback, useEffect, useRef, useState } from 'react';

import JobFormSheet from './components/jobFormSheet/JobFormSheet';
import JobsList from './components/jobsList/JobsList';
import JobsSkeleton from './components/jobsList/JobsSkeleton';
import Placeholder from './components/placeholder/Placeholder';
import Flex from '@/components/blocks/flex/Flex';
import Title from '@/components/blocks/title/Title';
import { constants as toastConstants, toast } from '@/components/blocks/toast/Toast';

import mappers from './mappers';

import type { JobsView } from './types';
import type {
    AggregatedJobsEvent,
    AggregatedRunningJob,
    CreateJobInput,
    Job,
    JobCancelledEvent,
    JobFailedEvent,
    JobFinishedEvent,
    JobTargetFinishedEvent,
    ScheduledJobEvent,
    ScheduledJobsEvent,
    UpdateJobInput,
} from '@/_types/_gen';
import type { StreamSubscription } from '@/api/service/client/types';

import constants from './constants';
import api from '@/api';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';

interface State {
    jobs: Job[];

    runtime: {
        jobIdToRunningJob: Record<string, AggregatedRunningJob>;
        jobIdToScheduledJob: Record<string, ScheduledJobEvent>;
    };

    jobIdToEdit: string;

    isFormOpen: boolean;
    isSubmitting: boolean;
    isFetchingJobs: boolean;
    isStreamHydrated: boolean;
}

const Jobs = () => {
    // State
    const [state, setState] = useState<State>({
        jobs: [],

        runtime: {
            jobIdToRunningJob: {},
            jobIdToScheduledJob: {},
        },

        jobIdToEdit: '',

        isFormOpen: false,
        isSubmitting: false,
        isFetchingJobs: true,
        isStreamHydrated: false,
    });

    // Stream handlers are subscribed once on mount, so they cannot reliably close over `state.jobs`.
    // Toasts still need the current job information, so we keep the latest list in a ref.
    const jobsRef = useRef(state.jobs);
    jobsRef.current = state.jobs;

    /**
     * Returns the current job for a stream event id, or `undefined` if it is not in the list.
     */
    const getJobForToast = useCallback((jobId: string) => jobsRef.current.find(job => job.id === jobId), []);

    /**
     * Opens the form for create (no job) or edit (with job). Closes when already open and called without a job.
     */
    const toggleJobFormSheet = (jobId?: string) => {
        setState(prev => {
            if (jobId) {
                return { ...prev, isFormOpen: true, jobIdToEdit: jobId };
            }

            return { ...prev, isFormOpen: !prev.isFormOpen, jobIdToEdit: '' };
        });
    };

    /**
     * Removes a deleted job from page state.
     */
    const onJobDeleted = (jobId: string) => {
        setState(prev => ({
            ...prev,
            jobs: prev.jobs.filter(job => job.id !== jobId),
        }));
    };

    /**
     * Handles the aggregated jobs event and updates the state.
     * @param data - The aggregated jobs event.
     */
    const onJobsAggregatedEvent = useCallback((data: AggregatedJobsEvent) => {
        setState(prev => {
            const jobIdToRunningJob = Object.fromEntries(data.runningJobs.map(job => [job.jobId, job]));
            const jobIdToScheduledJob = Object.fromEntries(data.scheduledJobs.map(job => [job.jobId, job]));

            // Replay target events into Job.executions
            const jobs = prev.jobs.map(job => {
                const running = jobIdToRunningJob?.[job.id];
                if (!running?.emittedEvents.length) {
                    return job;
                }

                const executions = running.emittedEvents.reduce(
                    (acc, event) => mappers.mapToExecutions(acc, event),
                    job.executions
                );
                return { ...job, executions };
            });

            return {
                ...prev,
                jobs,
                runtime: { jobIdToRunningJob, jobIdToScheduledJob },
                isStreamHydrated: true,
            };
        });
    }, []);

    /**
     * Updates the runtime overlay with the running jobs.
     */
    const onRunningJobsEvent = useCallback((runningJobs: string[]) => {
        setState(prev => ({
            ...prev,
            runtime: {
                ...prev.runtime,
                jobIdToRunningJob: Object.fromEntries(
                    runningJobs.map(jobId => [
                        jobId,
                        prev.runtime.jobIdToRunningJob[jobId] ?? { jobId, emittedEvents: [] },
                    ])
                ),
            },
        }));
    }, []);

    /**
     * Handles the job failed event and updates the state.
     */
    const onJobFailedEvent = useCallback(
        (event: JobFailedEvent) => {
            const title = getJobForToast(event.jobId)?.name || constants.label.toast.fallback;
            toast.add({ type: toastConstants.type.error, title, description: constants.label.toast.jobFailed });

            setState(prev => {
                const jobIdToRunningJob = { ...prev.runtime.jobIdToRunningJob };
                delete jobIdToRunningJob[event.jobId];

                return {
                    ...prev,
                    runtime: {
                        ...prev.runtime,
                        jobIdToRunningJob,
                    },
                };
            });
        },
        [getJobForToast]
    );

    /**
     * Updates the jobs list in state with the cancelled job.
     */
    const onJobCancelledEvent = useCallback(
        (event: JobCancelledEvent) => {
            const title = getJobForToast(event.jobId)?.name || constants.label.toast.fallback;
            toast.add({
                type: toastConstants.type.warning,
                title,
                description: constants.label.toast.jobCancelled,
            });

            setState(prev => {
                const jobIdToRunningJob = { ...prev.runtime.jobIdToRunningJob };
                delete jobIdToRunningJob[event.jobId];

                return {
                    ...prev,
                    runtime: { ...prev.runtime, jobIdToRunningJob },
                };
            });
        },
        [getJobForToast]
    );

    /**
     * Applies the scheduled-jobs snapshot: for each job in the event, sets the matching
     * entry in `runtime.jobIdToScheduledJob` (idle / stopped, nextRun, lastRun).
     *
     * Emitted on stream connect and whenever a job is scheduled, activated, or stopped.
     */
    const onScheduledJobsEvent = useCallback((event: ScheduledJobsEvent) => {
        setState(prev => ({
            ...prev,
            runtime: {
                ...prev.runtime,
                jobIdToScheduledJob: Object.fromEntries(event.scheduledJobs.map(job => [job.jobId, job])),
            },
        }));
    }, []);

    /**
     * Handles the `job-finished` stream event: clears the running overlay entry and records
     * when the run ended on the matching in-memory execution.
     *
     * The server emits one `executionId` per run (the same id as on `job-target-finished`). Live state
     * may already hold a matching `Execution` built from those events; this sets `schedule.finishedAt`
     * to the server timestamp so the UI matches persisted data without refetching.
     */
    const onJobFinishedEvent = useCallback(
        (event: JobFinishedEvent) => {
            const title = getJobForToast(event.jobId)?.name || constants.label.toast.fallback;
            toast.add({
                type: toastConstants.type.success,
                title,
                description: constants.label.toast.jobFinished,
            });

            setState(prev => {
                const jobIdToRunningJob = { ...prev.runtime.jobIdToRunningJob };
                delete jobIdToRunningJob[event.jobId];

                return {
                    ...prev,
                    runtime: {
                        ...prev.runtime,
                        jobIdToRunningJob,
                    },
                    jobs: prev.jobs.map(job => {
                        // Only the job that finished is updated; keep referential equality for the rest.
                        if (job.id !== event.jobId) {
                            return job;
                        }

                        const { executions } = job;

                        // No in-memory executions (e.g. missed target events), return job as is
                        if (!executions?.length) {
                            return job;
                        }

                        // Find the execution object for this run, return job as is, if not found
                        const execIdx = executions.findIndex(e => e.executionId === event.executionId);
                        if (execIdx === -1) {
                            return job;
                        }

                        // Immutable update: new executions array on the matched execution.
                        const nextExecutions = [...executions];
                        const prevExec = nextExecutions[execIdx];
                        nextExecutions[execIdx] = {
                            ...prevExec,
                            schedule: { ...prevExec.schedule, finishedAt: event.finishedAt },
                        };

                        return { ...job, executions: nextExecutions };
                    }),
                };
            });
        },
        [getJobForToast]
    );

    /**
     * Updates the jobs list in state with the finished target.
     */
    const onTargetFinishedEvent = useCallback(
        (event: JobTargetFinishedEvent) => {
            const title = getJobForToast(event.jobId)?.name || constants.label.toast.fallback;
            toast.add({
                type: toastConstants.type.info,
                title,
                description: constants.label.toast.targetFinished,
            });

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(job =>
                    job.id === event.jobId
                        ? { ...job, executions: mappers.mapToExecutions(job.executions, event) }
                        : job
                ),
            }));
        },
        [getJobForToast]
    );

    /**
     * Updates the selected job in state with the new data, replaces the old job with
     * the new one in the jobs list, and closes the form sheet.
     */
    const onUpdateJob = async (payload: UpdateJobInput) => {
        try {
            setState(prev => ({ ...prev, isSubmitting: true }));

            const job = state.jobs.find(job => job.id === state.jobIdToEdit);

            if (!job) return;

            const response = await api.service.resources.jobs.update(job.id, payload);

            toast.add({
                type: toastConstants.type.success,
                title: response.data.name,
                description: constants.label.toast.updated,
            });

            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(jobItem => (jobItem.id === response.data.id ? response.data : jobItem)),
                jobIdToEdit: '',
                isFormOpen: false,
            }));
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: constants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : constants.label.toast.mutationFailed,
            });
        } finally {
            setState(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    /**
     * Creates a new job from the form payload, adds the new job to
     * the jobs list in state, and closes the form sheet.
     */
    const onCreateJob = async (payload: CreateJobInput) => {
        try {
            setState(prev => ({ ...prev, isSubmitting: true }));

            const response = await api.service.resources.jobs.create(payload);

            toast.add({
                type: toastConstants.type.success,
                title: response.data.name,
                description: constants.label.toast.created,
            });

            setState(prev => ({
                ...prev,
                jobs: [...prev.jobs, response.data],
                jobIdToEdit: '',
                isFormOpen: false,
            }));
        } catch (error) {
            logging.error(error as Error);
            toast.add({
                type: toastConstants.type.error,
                title: constants.label.toast.fallback,
                description: error instanceof CustomError ? error.message : constants.label.toast.mutationFailed,
            });
        } finally {
            setState(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    /**
     * Fetches all jobs on mount, opens an SSE stream, and cleans up on unmount.
     *
     * `cancelled` guards against the StrictMode-style race where the effect
     * cleanup runs before the awaited `getAll()` resolves: without it, the
     * cleanup's `subscription?.close()` is a no-op (subscription is still
     * `null`), the next mount opens a second SSE connection, and every event
     * is delivered twice — duplicating targets in `executions[].tools[].targets`.
     */
    useEffect(() => {
        let cancelled = false;
        let subscription: StreamSubscription | null = null;

        const fetchAllJobs = async () => {
            try {
                if (cancelled) return;
                const response = await api.service.resources.jobs.getAll();

                setState(prevState => ({
                    ...prevState,
                    jobs: response.data,
                    isFetchingJobs: false,
                }));

                subscription = api.service.resources.jobs.streamAll({
                    on: {
                        'jobs-aggregated': onJobsAggregatedEvent,
                        'jobs-running': ({ runningJobs }) => onRunningJobsEvent(runningJobs),
                        'job-finished': jobFinishedEvent => onJobFinishedEvent(jobFinishedEvent),
                        'job-target-finished': jobTargetFinishedEvent => onTargetFinishedEvent(jobTargetFinishedEvent),
                        'job-failed': jobFailedEvent => onJobFailedEvent(jobFailedEvent),
                        'job-cancelled': jobCancelledEvent => onJobCancelledEvent(jobCancelledEvent),
                        'jobs-scheduled': scheduledJobsEvent => onScheduledJobsEvent(scheduledJobsEvent),
                    },
                    onError: err => console.error('Stream error:', err),
                });

                // Cleanup may have run between the await and now; close the
                // subscription we just opened so we don't leak it.
                if (cancelled) {
                    subscription.close();
                    return;
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchAllJobs();

        return () => {
            cancelled = true;
            subscription?.close();
        };
    }, [
        onJobsAggregatedEvent,
        onRunningJobsEvent,
        onJobFinishedEvent,
        onTargetFinishedEvent,
        onJobFailedEvent,
        onJobCancelledEvent,
        onScheduledJobsEvent,
    ]);

    // Determine view
    let view: JobsView = 'list';
    if (state.isFetchingJobs) {
        view = 'loading';
    } else if (state.jobs.length === 0) {
        view = 'empty';
    }

    // Determine content
    let content = null;

    if (view === 'loading') {
        content = <JobsSkeleton />;
    } else if (view === 'empty') {
        content = <Placeholder openFormSheet={() => toggleJobFormSheet()} />;
    } else {
        content = (
            <JobsList
                jobs={state.jobs}
                jobIdToRunningJob={state.runtime.jobIdToRunningJob}
                jobIdToScheduledJob={state.runtime.jobIdToScheduledJob}
                isStreamHydrated={state.isStreamHydrated}
                onEditJob={toggleJobFormSheet}
                onJobDeleted={onJobDeleted}
            />
        );
    }

    return (
        <Flex as="section" direction="column" className="min-h-0 flex-1 gap-0">
            <Title size="lg" spacing="md" level={1} weight="bold">
                Jobs
            </Title>

            {content}

            <JobFormSheet
                job={state.jobs.find(job => job.id === state.jobIdToEdit) || null}
                isRunning={!!state.runtime.jobIdToRunningJob[state.jobIdToEdit]}
                isOpen={state.isFormOpen}
                isSubmitting={state.isSubmitting}
                onOpenChange={() => toggleJobFormSheet()}
                onCreateJob={onCreateJob}
                onUpdateJob={onUpdateJob}
            />
        </Flex>
    );
};

export default Jobs;
