import { z } from 'zod';

import { CronJobType } from 'shared/types/jobs';

import { jobDocumentSchema } from '../schemas';
import { scraperToolTargetNameSchema } from 'shared/schemas/jobs';

/**
 * A create job payload schema.
 */
interface CreateJobPayload {
    userId: string;
    name: string;
    schedule: {
        type: CronJobType;
        startDate: Date;
        endDate: Date | null;
    } | null;
    tools: {
        type: 'scraper';
        targets: {
            target: z.infer<typeof scraperToolTargetNameSchema>;
            targetId: string;
            keywords?: string[];
            maxPages?: number;
        }[];
        keywords: string[];
        maxPages: number;
    }[];
    createdAt: Date;
}

/**
 * A update job payload schema.
 */
interface UpdateJobPayload {
    id: string;
    userId: string;
    name?: string;
    schedule: {
        type: CronJobType;
        startDate: Date;
        endDate: Date | null;
    } | null;
    tools: {
        type: 'scraper';
        targets: {
            target: z.infer<typeof scraperToolTargetNameSchema>;
            targetId: string;
            keywords?: string[];
            maxPages?: number;
        }[];
        keywords: string[];
        maxPages: number;
    }[];
    updatedAt: Date;
}

/**
 * A job document schema.
 */
type JobDocument = z.infer<typeof jobDocumentSchema>;

export type { CreateJobPayload, UpdateJobPayload, JobDocument };
