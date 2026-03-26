import { z } from 'zod';

import { executionToolTargetSchema } from 'shared/schemas/jobs/tools/execution/schemas-execution';
import {
    executionScraperDescriptionSchema,
    executionScraperInformationSchema,
    executionScraperPageContentSchema,
    executionScraperTargetResultSchema,
} from 'shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool';

/**
 * An execution scraper tool target.
 */
type ExecutionScraperToolTarget = z.infer<typeof executionToolTargetSchema>;

/**
 * A execution scraper description.
 */
type ExecutionScraperDescription = z.infer<typeof executionScraperDescriptionSchema>;

/**
 * A execution scraper information.
 */
type ExecutionScraperInformation = z.infer<typeof executionScraperInformationSchema>;

/**
 * A execution scraper page content.
 */
type ExecutionScraperPageContent = z.infer<typeof executionScraperPageContentSchema>;

/**
 * A scraper target result.
 */
type ExecutionScraperTargetResult = z.infer<typeof executionScraperTargetResultSchema>;

export type {
    ExecutionScraperToolTarget,
    ExecutionScraperDescription,
    ExecutionScraperInformation,
    ExecutionScraperPageContent,
    ExecutionScraperTargetResult,
};
