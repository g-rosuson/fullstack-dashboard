import { z } from 'zod';

import {
    executionScraperToolTargetListingSchema,
    executionScraperToolTargetResultSchema,
} from 'shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool';
import {
    executionScraperToolTargetSchema,
    executionScraperToolTargetScreenSchema,
} from 'shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool';

/**
 * An execution scraper tool target.
 */
type ExecutionScraperToolTarget = z.infer<typeof executionScraperToolTargetSchema>;

/**
 * Scraped listing item from a portal (success vs structured failure by `ok`).
 */
type ExecutionScraperToolTargetListing = z.infer<typeof executionScraperToolTargetListingSchema>;

/**
 * Optional deterministic filter stage.
 */
type ExecutionScraperToolTargetScreen = z.infer<typeof executionScraperToolTargetScreenSchema>;

/**
 * One persisted pipeline row for a scraper listing (item + optional stages).
 */
type ExecutionScraperToolTargetResult = z.infer<typeof executionScraperToolTargetResultSchema>;

export type {
    ExecutionScraperToolTarget,
    ExecutionScraperToolTargetListing,
    ExecutionScraperToolTargetResult,
    ExecutionScraperToolTargetScreen,
};
