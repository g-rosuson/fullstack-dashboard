import type { Job } from '@/_types/_gen';

/**
 * The props for the JobDetailSheet component.
 */
interface JobDetailSheetProps {
    isOpen: boolean;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
    job: (Job & { isRunning?: boolean }) | null;
}

export type { JobDetailSheetProps };
