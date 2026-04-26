import { ClockIcon } from 'lucide-react';

import constants from '../../../constants';
import { Job } from '@/_types/_gen/job';
import { JobScheduleType } from '@/_types/_gen/jobScheduleType';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

interface JobDetailsProps {
    job: Job;
    isRunning: boolean;
}

const JobDetails = ({ job, isRunning }: JobDetailsProps) => {
    // Determine the status badge
    let statusBadge = <Badge variant="warning">{constants.labels.pending}</Badge>;

    if (isRunning) {
        statusBadge = (
            <Badge>
                <Spinner />
                {constants.labels.running}
            </Badge>
        );
    } else if (!isRunning) {
        const isOnceJob = job.schedule?.type === JobScheduleType.once;
        const isExpired = job.schedule?.endDate && new Date(job.schedule.endDate) < new Date();
        const isIdle = isOnceJob || isExpired;

        if (isIdle) {
            statusBadge = <Badge variant="secondary">{constants.labels.idle}</Badge>;
        }
    }

    // Determine the dates and schedule type
    let lastRunDate = job.schedule?.lastRun ? new Date(job.schedule.lastRun).toLocaleString() : null;

    // If no last run, determine the last run from the executions,
    // used for non-scheduled jobs
    if (!lastRunDate) {
        const delegatedRuns = [];
        for (const execution of job?.executions || []) {
            const delegatedAtInMs = new Date(execution.schedule.delegatedAt).getTime();

            delegatedRuns.push(delegatedAtInMs);
        }

        lastRunDate = delegatedRuns.length > 0 ? new Date(Math.max(...delegatedRuns)).toLocaleString() : null;
    }

    const nextRunDate = job.schedule?.nextRun ? new Date(job.schedule.nextRun).toLocaleString() : null;
    const startDate = job.schedule?.startDate ? new Date(job.schedule.startDate).toLocaleString() : 'n/a';
    const endDate = job.schedule?.endDate ? new Date(job.schedule.endDate).toLocaleString() : 'n/a';
    const nextRun = nextRunDate || constants.labels.empty;
    const lastRun = lastRunDate || constants.labels.empty;
    const scheduleType = job.schedule?.type || constants.labels.unscheduled;

    return (
        <div className="flex flex-col gap-2">
            <section className="flex flex-wrap gap-2">
                {statusBadge}

                <Badge variant="secondary">
                    <ClockIcon />
                    {scheduleType}
                </Badge>
            </section>

            <section className="flex flex-col gap-1">
                <div>
                    <div className="font-bold text-xs">{constants.labels.nextRun} </div>
                    <span className="text-xs">{nextRun}</span>
                </div>

                <div>
                    <div className="font-bold text-xs">{constants.labels.lastRun} </div>
                    <span className="text-xs">{lastRun}</span>
                </div>
            </section>

            <section className="flex flex-col gap-1">
                <div>
                    <div className="font-bold text-xs">{constants.labels.start} </div>
                    <span className="text-xs">{startDate}</span>
                </div>

                <div>
                    <div className="font-bold text-xs">{constants.labels.end} </div>
                    <span className="text-xs">{endDate}</span>
                </div>
            </section>
        </div>
    );
};

export default JobDetails;
