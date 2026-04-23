import { Job } from '@/_types/_gen';

interface JobCardProps {
    job: Job;
    isRunning: boolean;
    onOpen: (job: Job) => void;
    onEdit: (job: Job) => void;
    onDelete: (jobId: string) => void;
}

export type { JobCardProps };
