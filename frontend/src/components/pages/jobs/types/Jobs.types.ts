import { Job } from '@/_types/_gen';

/**
 * The state for the Jobs component.
 */
interface JobsState {
    detailSheet: {
        isOpen: boolean;
        job: Job | null;
    };
    formSheet: {
        isOpen: boolean;
        job: Job | null;
    };
    confirmationDialog: {
        isOpen: boolean;
        jobId: string | null;
    };
    jobs: Job[];
    runningJobs: string[];
    isLoading: boolean;
}

export type { JobsState };
