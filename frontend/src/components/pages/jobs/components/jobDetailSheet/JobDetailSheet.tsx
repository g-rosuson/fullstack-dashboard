import JobDetails from '../shared/jobDetails/JobDetails';
import Execution from './execution/Execution';
import Sheet from '@/components/ui-app/sheet/Sheet';

import type { JobDetailSheetProps } from './types';

import { DialogTitle } from '@/components/ui/dialog';

const JobDetailSheet = ({ job, isRunning, isOpen, onOpenChange }: JobDetailSheetProps) => {
    if (!job) {
        return null;
    }

    return (
        <Sheet open={isOpen && !!job} onOpenChange={onOpenChange} side="right">
            <div>
                <header className="mb-3">
                    <DialogTitle size="l">{job?.name}</DialogTitle>

                    <JobDetails job={job} isRunning={isRunning} />
                </header>

                <section>
                    <DialogTitle size="m">Executions</DialogTitle>

                    {(job.executions || []).map(execution => (
                        <Execution key={execution.executionId} execution={execution} />
                    ))}
                </section>
            </div>
        </Sheet>
    );
};

export default JobDetailSheet;
