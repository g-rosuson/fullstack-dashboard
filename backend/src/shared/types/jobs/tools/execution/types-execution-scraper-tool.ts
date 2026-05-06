import { z } from 'zod';

import {
    executionJobItemRowSchema,
    executionScrapedItemSchema,
} from 'shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool';
import { executionScraperToolTargetSchema } from 'shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool';

/**
 * An execution scraper tool target.
 */
type ExecutionScraperToolTarget = z.infer<typeof executionScraperToolTargetSchema>;

/**
 * Scraped listing item from a portal (success vs structured failure by `ok`).
 */
type ExecutionScrapedItem = z.infer<typeof executionScrapedItemSchema>;

/**
 * One persisted pipeline row for a scraper listing (item + optional stages).
 */
type ExecutionJobItemRow = z.infer<typeof executionJobItemRowSchema>;

export type { ExecutionJobItemRow, ExecutionScraperToolTarget, ExecutionScrapedItem };
