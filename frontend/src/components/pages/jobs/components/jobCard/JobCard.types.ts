import { EnrichedJob } from '@/_types/_gen';

interface JobCardProps {
    job: EnrichedJob;
    isRunning: boolean;
    onOpen: (job: EnrichedJob) => void;
    onEdit: (job: EnrichedJob) => void;
    onDelete: (jobId: string) => void;
}

export type { JobCardProps };
