import { ClockIcon } from 'lucide-react';

import Execution from './execution/Execution';
import Sheet from '@/components/ui-app/sheet/Sheet';

import type { JobDetailSheetProps } from './types';

import constants from '../constants';
import { Badge } from '@/components/ui/badge';
import { DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const JobDetailSheet = ({ job, isRunning, isOpen, onOpenChange }: JobDetailSheetProps) => {
    // Determine the last run time
    let lastRunDate = job?.schedule?.lastRun ? new Date(job.schedule.lastRun).toLocaleString() : null;

    // Determine the next run date
    const nextRunDate = job?.schedule?.nextRun ? new Date(job.schedule.nextRun).toLocaleString() : null;

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

    // Determine the dates and schedule type
    const startDate = job?.schedule?.startDate
        ? new Date(job.schedule.startDate).toLocaleString()
        : constants.labels.empty;
    const endDate = job?.schedule?.endDate ? new Date(job.schedule.endDate).toLocaleString() : constants.labels.empty;
    const nextRun = nextRunDate || constants.labels.empty;
    const lastRun = lastRunDate || constants.labels.empty;
    const scheduleType = job?.schedule?.type || constants.labels.unscheduled;

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
        (!job?.schedule && !isRunning) ||
        (!isRunning && job?.schedule?.endDate && new Date(job?.schedule.endDate) < new Date());

    if (isIdle) {
        statusBadge = <Badge>{constants.labels.idle}</Badge>;
    }

    return (
        <Sheet open={isOpen && !!job} onOpenChange={onOpenChange} side="right">
            <div className="w-full flex flex-col gap-5 py-4">
                <header className="flex flex-col gap-2">
                    <DialogTitle className="text-xl">{job?.name}</DialogTitle>

                    <div className="flex flex-wrap gap-2">
                        {statusBadge}

                        <Badge variant="secondary">
                            <ClockIcon />
                            {scheduleType}
                        </Badge>
                    </div>
                </header>

                <section className="flex flex-col gap-2">
                    <section>
                        <div className="flex flex-col gap-1">
                            <div>
                                <div className="font-bold text-sm">{constants.labels.nextRun} </div>
                                <span className="text-xs">{nextRun}</span>
                            </div>

                            <div>
                                <div className="font-bold text-sm">{constants.labels.lastRun} </div>
                                <span className="text-xs">{lastRun}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-col gap-1">
                            <div>
                                <div className="font-bold text-sm">{constants.labels.start} </div>
                                <span className="text-xs">{startDate}</span>
                            </div>

                            <div>
                                <div className="font-bold text-sm">{constants.labels.end} </div>
                                <span className="text-xs">{endDate}</span>
                            </div>
                        </div>
                    </section>
                </section>

                <section>
                    <DialogTitle className="font-bold text-lg mb-2">Executions</DialogTitle>

                    {(job?.executions || []).map(execution => (
                        <Execution key={execution.executionId} execution={execution} />
                    ))}
                </section>
            </div>
        </Sheet>
    );
};

export default JobDetailSheet;
