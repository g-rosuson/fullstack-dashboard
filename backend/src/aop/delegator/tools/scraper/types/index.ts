import { z } from 'zod';

import type { ExecutionScraperToolTarget } from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import { requestUserDataSchema } from '../schemas';

/**
 * A function to invoke onTargetFinish with the target results.
 */
// eslint-disable-next-line no-unused-vars
type ScraperOnTargetFinish = (target: ExecutionScraperToolTarget) => void;

/**
 * A request user data type.
 */
type RequestUserData = z.infer<typeof requestUserDataSchema>;

/**
 * A scraper request interface.
 */
interface ScraperRequest {
    url: string;
    uniqueKey: string;
    userData: RequestUserData;
}

export type { RequestUserData, ScraperOnTargetFinish, ScraperRequest };
