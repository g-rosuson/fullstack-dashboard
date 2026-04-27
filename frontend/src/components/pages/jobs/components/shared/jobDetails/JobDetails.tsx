import { ClockIcon } from 'lucide-react';

import Heading from '@/components/ui-app/heading/Heading';
import Text from '@/components/ui-app/text/Text';

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
    let statusBadge = (
        <Badge variant="warning">
            <Text size="xs" appearance="foreground">
                {constants.labels.pending}
            </Text>
        </Badge>
    );

    if (isRunning) {
        statusBadge = (
            <Badge>
                <Spinner />
                <Text size="xs" appearance="foreground">
                    {constants.labels.running}
                </Text>
            </Badge>
        );
    } else if (!isRunning) {
        const isOnceJob = job.schedule?.type === JobScheduleType.once;
        const isExpired = job.schedule?.endDate && new Date(job.schedule.endDate) < new Date();
        const isIdle = isOnceJob || isExpired;

        if (isIdle) {
            statusBadge = (
                <Badge variant="secondary">
                    <Text size="xs" appearance="foreground">
                        {constants.labels.idle}
                    </Text>
                </Badge>
            );
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
        <div className="flex flex-col gap-3">
            <section className="flex flex-wrap gap-2">
                {statusBadge}

                <Badge variant="secondary">
                    <ClockIcon />
                    <Text size="xs" appearance="foreground">
                        {scheduleType}
                    </Text>
                </Badge>
            </section>

            <section className="flex flex-col gap-2">
                <div>
                    <Heading size="xs" level={3}>
                        {constants.labels.nextRun}
                    </Heading>
                    <Text size="xs">{nextRun}</Text>
                </div>

                <div>
                    <Heading size="xs" level={3}>
                        {constants.labels.lastRun}
                    </Heading>
                    <Text size="xs">{lastRun}</Text>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <div>
                    <Heading size="xs" level={3}>
                        {constants.labels.start}
                    </Heading>
                    <Text size="xs">{startDate}</Text>
                </div>

                <div>
                    <Heading size="xs" level={3}>
                        {constants.labels.end}
                    </Heading>
                    <Text size="xs">{endDate}</Text>
                </div>
            </section>
        </div>
    );
};

export default JobDetails;
