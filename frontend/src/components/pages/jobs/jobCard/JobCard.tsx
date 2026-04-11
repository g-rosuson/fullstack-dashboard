import { ClockIcon } from 'lucide-react';

import DropdownMenu from '@/components/ui-app/dropdownMenu/DropdownMenu';

import type { JobCardProps } from './JobCard.types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const IDLE_LABEL = 'Idle';
const RUNNING_LABEL = 'Running';

const JobCard = ({ job, onEdit, onDelete }: JobCardProps) => {
    // Determine the status badge
    let statusBadge = <Badge variant="secondary">{IDLE_LABEL}</Badge>;

    if (job.isRunning) {
        statusBadge = (
            <Badge>
                <Spinner />
                {RUNNING_LABEL}
            </Badge>
        );
    }

    // Determine the last run time
    const delegatedRuns = [];
    let lastRun = 'n/a';

    for (const execution of job.executions || []) {
        const delegatedAtInMs = new Date(execution.schedule.delegatedAt).getTime();

        delegatedRuns.push(delegatedAtInMs);

        if (delegatedRuns.length > 0) {
            const newest = Math.max(...delegatedRuns);
            lastRun = new Date(newest).toLocaleString();
        }
    }

    // Determine navigation items
    const navItems = [
        {
            label: 'Run',
            onClick: () => {},
        },
        {
            label: 'Edit',
            onClick: () => onEdit(job),
        },
        {
            label: 'Open',
            onClick: () => {},
        },
        {
            label: 'Delete',
            variant: 'destructive' as const,
            onClick: () => onDelete(job.id),
        },
    ];

    return (
        <Card className="gap-3 cursor-pointer">
            <CardHeader>
                <div className="min-w-0 flex items-start justify-between gap-2">
                    <CardTitle className="truncate">Job aggregation workflow</CardTitle>

                    <DropdownMenu dropdownItems={navItems} />
                </div>

                <div className="flex flex-wrap gap-2">
                    {statusBadge}

                    <Badge variant="secondary">
                        <ClockIcon />
                        {job.schedule?.type || 'Un-scheduled'}
                    </Badge>
                </div>
            </CardHeader>

            <section>
                <CardContent className="flex flex-col gap-1">
                    <div>
                        <div className="font-bold text-xs">Next run </div>
                        <span className="text-xs">n/a</span>
                    </div>

                    <div>
                        <div className="font-bold text-xs">Last run </div>
                        <span className="text-xs">{lastRun}</span>
                    </div>
                </CardContent>
            </section>

            <section>
                <CardContent className="flex flex-col gap-1">
                    <div>
                        <div className="font-bold text-xs">Start </div>
                        <span className="text-xs">{job.schedule?.startDate || 'n/a'}</span>
                    </div>

                    <div>
                        <div className="font-bold text-xs">End </div>
                        <span className="text-xs">{job.schedule?.endDate || 'n/a'}</span>
                    </div>
                </CardContent>
            </section>
        </Card>
    );
};

export default JobCard;
