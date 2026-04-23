import { ClockIcon } from 'lucide-react';

import DropdownMenu from '@/components/ui-app/dropdownMenu/DropdownMenu';

import type { JobCardProps } from './JobCard.types';

import constants from '../constants';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const JobCard = ({ job, isRunning, onOpen, onEdit, onDelete }: JobCardProps) => {
    // Determine the last run time
    let lastRunDate = job.schedule?.lastRun ? new Date(job.schedule.lastRun).toLocaleString() : null;

    // Determine the next run date
    const nextRunDate = job.schedule?.nextRun ? new Date(job.schedule.nextRun).toLocaleString() : null;

    // If no last run, determine the last run from the executions,
    // used for non-scheduled jobs
    if (!lastRunDate) {
        const delegatedRuns = [];
        for (const execution of job.executions || []) {
            const delegatedAtInMs = new Date(execution.schedule.delegatedAt).getTime();

            delegatedRuns.push(delegatedAtInMs);
        }

        lastRunDate = delegatedRuns.length > 0 ? new Date(Math.max(...delegatedRuns)).toLocaleString() : null;
    }

    // Determine navigation items
    const navItems = [
        {
            label: constants.labels.edit,
            onClick: () => onEdit(job),
        },
        {
            label: constants.labels.open,
            onClick: () => onOpen(job),
        },
        {
            label: constants.labels.delete,
            variant: 'destructive' as const,
            onClick: () => onDelete(job.id),
        },
    ];

    // Determine the status badge
    let statusBadge = <Badge variant="warning">{constants.labels.pending}</Badge>;

    if (isRunning) {
        statusBadge = (
            <Badge>
                <Spinner />
                {constants.labels.running}
            </Badge>
        );
    }

    const isIdle =
        (!job.schedule && !isRunning) ||
        (!isRunning && job.schedule?.endDate && new Date(job.schedule.endDate) < new Date());

    if (isIdle) {
        statusBadge = <Badge>{constants.labels.idle}</Badge>;
    }

    // Determine the dates and schedule type
    const startDate = job.schedule?.startDate ? new Date(job.schedule.startDate).toLocaleString() : 'n/a';
    const endDate = job.schedule?.endDate ? new Date(job.schedule.endDate).toLocaleString() : 'n/a';
    const nextRun = nextRunDate || constants.labels.empty;
    const lastRun = lastRunDate || constants.labels.empty;
    const scheduleType = job.schedule?.type || constants.labels.unscheduled;

    return (
        <Card className="gap-3 cursor-pointer" onClick={() => onOpen(job)}>
            <CardHeader>
                <div className="min-w-0 flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{job.name}</CardTitle>

                    <DropdownMenu dropdownItems={navItems} />
                </div>

                <div className="flex flex-wrap gap-2">
                    {statusBadge}

                    <Badge variant="secondary">
                        <ClockIcon />
                        {scheduleType}
                    </Badge>
                </div>
            </CardHeader>

            <section>
                <CardContent className="flex flex-col gap-1">
                    <div>
                        <div className="font-bold text-xs">{constants.labels.nextRun} </div>
                        <span className="text-xs">{nextRun}</span>
                    </div>

                    <div>
                        <div className="font-bold text-xs">{constants.labels.lastRun} </div>
                        <span className="text-xs">{lastRun}</span>
                    </div>
                </CardContent>
            </section>

            <section>
                <CardContent className="flex flex-col gap-1">
                    <div>
                        <div className="font-bold text-xs">{constants.labels.start} </div>
                        <span className="text-xs">{startDate}</span>
                    </div>

                    <div>
                        <div className="font-bold text-xs">{constants.labels.end} </div>
                        <span className="text-xs">{endDate}</span>
                    </div>
                </CardContent>
            </section>
        </Card>
    );
};

export default JobCard;
