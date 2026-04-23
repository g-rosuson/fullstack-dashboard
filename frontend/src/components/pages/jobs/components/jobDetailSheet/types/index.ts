import type { Job } from '@/_types/_gen';

/**
 * The props for the JobDetailSheet component.
 */
interface JobDetailSheetProps {
    job: Job | null;
    isRunning: boolean;
    isOpen: boolean;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
}

export type { JobDetailSheetProps };
