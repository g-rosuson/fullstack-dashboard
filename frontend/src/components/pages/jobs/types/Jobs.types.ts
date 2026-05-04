import { EnrichedJob } from '@/_types/_gen';

/**
 * The state for the Jobs component.
 */
interface JobsState {
    detailSheet: {
        isOpen: boolean;
        job: EnrichedJob | null;
    };
    formSheet: {
        isOpen: boolean;
        job: EnrichedJob | null;
    };
    confirmationDialog: {
        isOpen: boolean;
        jobId: string | null;
    };
    jobs: EnrichedJob[];
    runningJobs: string[];
    isLoading: boolean;
}

export type { JobsState };
