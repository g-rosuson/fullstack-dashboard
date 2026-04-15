import { ClockIcon } from 'lucide-react';

import Sheet from '@/components/ui-app/sheet/Sheet';

import type { JobDetailSheetProps } from './JobDetailSheet.types';

import { Badge } from '@/components/ui/badge';
import { DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const IDLE_LABEL = 'Idle';
const RUNNING_LABEL = 'Running';

const JobDetailSheet = ({ isOpen, onOpenChange, job }: JobDetailSheetProps) => {
    // Determine the status badge
    let statusBadge = <Badge variant="secondary">{IDLE_LABEL}</Badge>;

    if (job?.isRunning) {
        statusBadge = (
            <Badge>
                <Spinner />
                {RUNNING_LABEL}
            </Badge>
        );
    }

    // Determine the schedule type
    const scheduleType = job?.schedule?.type ?? 'Un-scheduled';

    // Determine the start and end dates
    const startDate = job?.schedule?.startDate ? new Date(job.schedule.startDate).toLocaleString() : 'n/a';
    const endDate = job?.schedule?.endDate ? new Date(job.schedule.endDate).toLocaleString() : 'n/a';

    // Determine the last run
    const delegatedRuns: number[] = [];
    for (const execution of job?.executions || []) {
        delegatedRuns.push(new Date(execution.schedule.delegatedAt).getTime());
    }
    const lastRun = delegatedRuns.length > 0 ? new Date(Math.max(...delegatedRuns)).toLocaleString() : 'n/a';

    return (
        <Sheet open={isOpen && !!job} onOpenChange={onOpenChange} width="half" side="bottom">
            <div className="w-full min-h-[60dvh] max-w-[70%] mx-auto flex flex-col gap-5 py-4">
                <header className="flex flex-col gap-2">
                    <DialogTitle>{job?.name}</DialogTitle>

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
                                <div className="font-bold text-md">Next run </div>
                                <span className="text-sm">n/a</span>
                            </div>

                            <div>
                                <div className="font-bold text-md">Last run </div>
                                <span className="text-sm">{lastRun}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-col gap-1">
                            <div>
                                <div className="font-bold text-md">Start date</div>
                                <span className="text-sm">{startDate}</span>
                            </div>

                            <div>
                                <div className="font-bold text-md">End date</div>
                                <span className="text-sm">{endDate}</span>
                            </div>
                        </div>
                    </section>
                </section>
            </div>
        </Sheet>
    );
};

export default JobDetailSheet;
