import { Job } from '@/_types/_gen';

/**
 * A mapped job with an optional running status.
 */
interface ExtendedJob extends Job {
    isRunning?: boolean;
}

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
    jobs: ExtendedJob[];
    isLoading: boolean;
}

export type { JobsState };
