import { CreateJobInput, EmailToolType, Job, JobScheduleType, ScraperToolType, UpdateJobInput } from '@/_types/_gen';

/**
 * A scraper tool with an optional id and targets with optional ids.
 */
type JobFormSheetToolScraper = {
    type: ScraperToolType;
    keyword?: string;
    keywords: string[];
    maxPages: number;
    toolId?: string;
    targets: {
        target: string;
        label: string;
        keyword: string;
        keywords: string[];
        maxPages: number;
        targetId?: string;
    }[];
};

/**
 * An email tool with an optional id and targets with optional ids.
 */
type JobFormSheetToolEmail = {
    type: EmailToolType;
    subject: string;
    body: string;
    toolId?: string;
    targets: {
        target: string;
        subject: string;
        body: string;
        targetId?: string;
    }[];
};

/**
 * A tool with an optional id and targets with optional ids.
 */
type JobFormSheetTool = JobFormSheetToolScraper | JobFormSheetToolEmail;

/**
 * The props for the JobFormSheet component.
 */
interface JobFormSheetProps {
    job: Job | null;
    isRunning: boolean;
    isOpen: boolean;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
    onCreateJob: (payload: CreateJobInput) => Promise<void>;
    onUpdateJob: (payload: UpdateJobInput) => Promise<void>;
}

/**
 * The state for the JobFormSheet component.
 */
interface JobFormSheetState {
    name: string;
    scheduleType: JobScheduleType | string;
    startDate: Date | undefined;
    startTime: string;
    endDate: Date | undefined;
    endTime: string;
    tools: JobFormSheetTool[];
    toolToEdit: JobFormSheetTool | null;
    isEditing: boolean;
    isSubmitting: boolean;
    isToolDialogOpen: boolean;
    runJob: boolean;
}

export type { JobFormSheetProps, JobFormSheetState, JobFormSheetTool, JobFormSheetToolScraper, JobFormSheetToolEmail };
